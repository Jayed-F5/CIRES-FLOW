import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import { extname, join } from 'path';
import { open, unlink } from 'fs/promises';
import type { Response } from 'express';
import { PieceJointeService } from './piece-jointe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

// Signatures d'octets (« magic bytes ») pour chaque extension autorisée, afin
// qu'un fichier malveillant simplement renommé avec une extension de confiance
// soit rejeté après l'upload. .docx/.xlsx sont tous deux des conteneurs
// zip/OOXML et partagent donc la même signature.
const SIGNATURES: Record<string, number[][]> = {
  '.pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  '.png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.docx': [[0x50, 0x4b, 0x03, 0x04]],
  '.xlsx': [[0x50, 0x4b, 0x03, 0x04]],
};

async function matchesSignature(filePath: string, ext: string): Promise<boolean> {
  const signatures = SIGNATURES[ext];
  if (!signatures) {
    return false;
  }

  const maxLen = Math.max(...signatures.map((sig) => sig.length));
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(maxLen);
    const { bytesRead } = await handle.read(buffer, 0, maxLen, 0);
    return signatures.some(
      (sig) => bytesRead >= sig.length && sig.every((byte, i) => buffer[i] === byte),
    );
  } finally {
    await handle.close();
  }
}

@Controller('demande/:demandeId/pieces-jointes')
export class PieceJointeController {
  constructor(private pieceJointeService: PieceJointeService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const randomName = randomBytes(16).toString('hex');
          callback(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return callback(
            new BadRequestException(`Type de fichier non autorisé : ${ext}`),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async upload(
    @Param('demandeId', ParseIntPipe) demandeId: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const ext = extname(file.originalname).toLowerCase();
    const filePath = join(process.cwd(), 'uploads', file.filename);
    const valid = await matchesSignature(filePath, ext);

    if (!valid) {
      await unlink(filePath).catch(() => undefined);
      throw new BadRequestException(
        `Le contenu du fichier ne correspond pas au type ${ext}`,
      );
    }

    return this.pieceJointeService.create(demandeId, file.originalname, file.filename, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findByDemande(@Param('demandeId', ParseIntPipe) demandeId: number, @Req() req: any) {
    return this.pieceJointeService.findByDemande(demandeId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':pieceJointeId/download')
  async download(
    @Param('pieceJointeId', ParseIntPipe) pieceJointeId: number,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const piece = await this.pieceJointeService.findOneForDownload(pieceJointeId, req.user);
    const filePath = join(process.cwd(), 'uploads', piece.cheminFichier);
    res.download(filePath, piece.nomFichier);
  }
}