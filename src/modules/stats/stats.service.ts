import { Injectable } from '@nestjs/common';
import { ProductsService } from '@/modules/catalog/products.service';
import { DirectoryService } from '@/modules/directory/directory.service';
import { StorefrontStats } from '@/modules/stats/interfaces/storefront-stats.interface';
import { StudentsService } from '@/modules/students/students.service';
import { VendorsService } from '@/modules/vendors/vendors.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly directoryService: DirectoryService,
    private readonly productsService: ProductsService,
    private readonly vendorsService: VendorsService,
  ) {}

  async getStorefrontStats(): Promise<StorefrontStats> {
    const [verifiedStudents, partnerInstitutions, totalProducts, approvedVendors] =
      await Promise.all([
        this.studentsService.countVerified(),
        this.directoryService.countInstitutions(),
        this.productsService.countActive(),
        this.vendorsService.countApproved(),
      ]);

    return { verifiedStudents, partnerInstitutions, totalProducts, approvedVendors };
  }
}
