import { PrismaService } from '../prisma/prisma.service';
import { CategorieService } from './categorie.service';

describe('CategorieService', () => {
  let service: CategorieService;

  beforeEach(() => {
    const prisma = {} as PrismaService;
    service = new CategorieService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
