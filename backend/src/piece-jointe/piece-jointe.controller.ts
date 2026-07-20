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
import type { Response } from 'express';
import { PieceJointeService } from './piece-jointe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

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