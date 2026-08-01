import { PrismaService } from '../prisma/prisma.service';
import { DepartementService } from './departement.service';

describe('DepartementService', () => {
  let service: DepartementService;

  beforeEach(() => {
    const prisma = {} as PrismaService;
    service = new DepartementService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
