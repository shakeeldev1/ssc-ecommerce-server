import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import type { ExternalCardProfile } from '@/modules/card-activation/interfaces/student-sync-provider.interface';
import { DirectoryService } from '@/modules/directory/directory.service';
import { MediaService } from '@/modules/media/media.service';
import { CreateAddressDto } from '@/modules/students/dto/create-address.dto';
import { UpdateAddressDto } from '@/modules/students/dto/update-address.dto';
import { UpdateStudentProfileDto } from '@/modules/students/dto/update-student-profile.dto';
import { Address } from '@/modules/students/entities/address.entity';
import { StudentProfile } from '@/modules/students/entities/student-profile.entity';
import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';
import { Gender } from '@/modules/students/enums/gender.enum';
import { generateStudentIdNumber } from '@/modules/students/utils/generate-student-id.util';

const PROFILE_RELATIONS = { institution: true, district: true, region: true };

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly profilesRepository: Repository<StudentProfile>,
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
    private readonly directoryService: DirectoryService,
    private readonly mediaService: MediaService,
  ) {}

  async findOrCreateForUser(userId: string): Promise<StudentProfile> {
    const existing = await this.profilesRepository.findOne({
      where: { userId },
      relations: PROFILE_RELATIONS,
    });
    if (existing) {
      return existing;
    }

    const created = await this.profilesRepository.save(
      this.profilesRepository.create({ userId, studentIdNumber: generateStudentIdNumber() }),
    );
    return this.profilesRepository.findOneOrFail({
      where: { id: created.id },
      relations: PROFILE_RELATIONS,
    });
  }

  async updateProfile(userId: string, dto: UpdateStudentProfileDto): Promise<StudentProfile> {
    const profile = await this.findOrCreateForUser(userId);

    if (dto.institutionId) {
      await this.directoryService.getInstitutionOrFail(dto.institutionId);
    }
    if (dto.districtId) {
      await this.directoryService.getDistrictOrFail(dto.districtId);
    }
    if (dto.regionId) {
      await this.directoryService.getRegionOrFail(dto.regionId);
    }

    await this.profilesRepository.update(profile.id, {
      institutionId: dto.institutionId ?? profile.institutionId,
      districtId: dto.districtId ?? profile.districtId,
      regionId: dto.regionId ?? profile.regionId,
      dateOfBirth: dto.dateOfBirth ?? profile.dateOfBirth,
      gender: dto.gender ?? profile.gender,
    });

    return this.findOrCreateForUser(userId);
  }

  /**
   * Syncs profile fields from the holder record in the external Student
   * Smart Card system during card activation/linking/refresh. Personal
   * fields (photo, DOB, gender) only overwrite when the issuer actually has
   * a value, so a blank issuer field never wipes what the user set here.
   * Card/school fields always mirror the issuer, and are cleared for
   * individual holders (who have no school).
   */
  async applyExternalSync(profileId: string, externalProfile: ExternalCardProfile): Promise<void> {
    const gender = this.mapExternalGender(externalProfile.gender);
    const isStudent = externalProfile.holderType === ExternalHolderType.STUDENT;

    await this.profilesRepository.update(profileId, {
      ...(externalProfile.photoUrl
        ? { photoUrl: externalProfile.photoUrl, photoPublicId: null }
        : {}),
      ...(externalProfile.dateOfBirth ? { dateOfBirth: externalProfile.dateOfBirth } : {}),
      ...(gender ? { gender } : {}),
      externalHolderType: externalProfile.holderType,
      externalInstitutionName: isStudent ? externalProfile.institutionName : null,
      externalInstitutionLogoUrl: isStudent ? externalProfile.institutionLogoUrl : null,
      externalClassName: isStudent ? externalProfile.className : null,
      externalSectionName: isStudent ? externalProfile.sectionName : null,
      externalRollNumber: isStudent ? externalProfile.rollNumber : null,
      externalSyncedAt: new Date(),
    });
  }

  private mapExternalGender(gender: ExternalCardProfile['gender']): Gender | null {
    if (gender === 'male') return Gender.MALE;
    if (gender === 'female') return Gender.FEMALE;
    if (gender === 'other') return Gender.OTHER;
    return null;
  }

  async uploadPhoto(userId: string, fileBuffer: Buffer): Promise<StudentProfile> {
    const profile = await this.findOrCreateForUser(userId);

    const uploaded = await this.mediaService.uploadImage(fileBuffer, 'student-photos');

    if (profile.photoPublicId) {
      await this.mediaService.deleteImage(profile.photoPublicId);
    }

    await this.profilesRepository.update(profile.id, {
      photoUrl: uploaded.url,
      photoPublicId: uploaded.publicId,
    });

    return this.findOrCreateForUser(userId);
  }

  async listAddresses(userId: string): Promise<Address[]> {
    const profile = await this.findOrCreateForUser(userId);
    return this.addressesRepository.find({
      where: { studentProfileId: profile.id },
      order: { createdAt: 'DESC' },
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    const profile = await this.findOrCreateForUser(userId);

    if (dto.isDefault) {
      await this.addressesRepository.update({ studentProfileId: profile.id }, { isDefault: false });
    }

    return this.addressesRepository.save(
      this.addressesRepository.create({ ...dto, studentProfileId: profile.id }),
    );
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<Address> {
    const profile = await this.findOrCreateForUser(userId);
    const address = await this.getOwnedAddressOrFail(profile.id, addressId);

    if (dto.isDefault) {
      await this.addressesRepository.update({ studentProfileId: profile.id }, { isDefault: false });
    }

    await this.addressesRepository.update(address.id, dto);
    return this.getOwnedAddressOrFail(profile.id, addressId);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const profile = await this.findOrCreateForUser(userId);
    await this.getOwnedAddressOrFail(profile.id, addressId);
    await this.addressesRepository.delete(addressId);
  }

  /** Students whose profile has been synced from a verified card in the external Smart Card system. */
  countVerified(): Promise<number> {
    return this.profilesRepository.count({ where: { externalHolderType: Not(IsNull()) } });
  }

  private async getOwnedAddressOrFail(
    studentProfileId: string,
    addressId: string,
  ): Promise<Address> {
    const address = await this.addressesRepository.findOne({ where: { id: addressId } });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    if (address.studentProfileId !== studentProfileId) {
      throw new ForbiddenException('This address does not belong to you');
    }
    return address;
  }
}
