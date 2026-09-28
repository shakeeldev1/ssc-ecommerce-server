import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import streamifier from 'streamifier';
import { Configuration } from '@/config/configuration';

export interface UploadedImage {
  url: string;
  publicId: string;
}

@Injectable()
export class MediaService implements OnModuleInit {
  private configured = false;

  constructor(private readonly configService: ConfigService<Configuration, true>) {}

  onModuleInit(): void {
    const { cloudName, apiKey, apiSecret } = this.configService.get('cloudinary', { infer: true });
    this.configured = Boolean(cloudName && apiKey && apiSecret);

    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  uploadImage(fileBuffer: Buffer, folder: string): Promise<UploadedImage> {
    this.assertConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(new Error(error?.message ?? 'Cloudinary upload failed with no response'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    this.assertConfigured();
    await cloudinary.uploader.destroy(publicId);
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Image uploads are not configured yet (missing Cloudinary credentials)',
      );
    }
  }
}
