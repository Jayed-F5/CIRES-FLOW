import { Test, TestingModule } from '@nestjs/testing';
import { CommentaireService } from './commentaire.service';
import { PrismaService } from '../prisma/prisma.service';
import { HistoriqueService } from '../historique/historique.service';
import { NotificationService } from '../notification/notification.service';

describe('CommentaireService', () => {
  let service: CommentaireService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentaireService,
        { provide: PrismaService, useValue: {} },
        { provide: HistoriqueService, useValue: {} },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get<CommentaireService>(CommentaireService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
