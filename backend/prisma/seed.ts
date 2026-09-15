// Crée le premier compte ADMIN si aucun n'existe encore, pour remplacer la
// procédure manuelle documentée dans le README (générer un hash bcrypt à la
// main, puis l'insérer via Prisma Studio ou en SQL direct).
//
// Variables d'environnement (à ajouter dans backend/.env) :
//   SEED_ADMIN_EMAIL     (obligatoire pour que le script crée un compte)
//   SEED_ADMIN_PASSWORD  (obligatoire, 8 caractères minimum)
//   SEED_ADMIN_NOM       (optionnel, défaut "Admin")
//   SEED_ADMIN_PRENOM    (optionnel, défaut "Principal")
//
// Usage : npx prisma db seed
//
// Idempotent : si un utilisateur existe déjà avec SEED_ADMIN_EMAIL, le script
// ne fait rien (il ne réinitialise jamais un mot de passe existant).

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD non définis dans backend/.env : ' +
        'aucun compte admin créé. Renseignez ces deux variables puis relancez ' +
        '"npx prisma db seed" pour amorcer le premier compte administrateur.',
    );
    return;
  }

  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD doit contenir au moins 8 caractères.');
  }

  const existing = await prisma.utilisateur.findUnique({ where: { email } });
  if (existing) {
    console.log(
      `Un utilisateur existe déjà pour ${email} (id ${existing.id}) : rien à faire.`,
    );
    return;
  }

  const motDePasse = await bcrypt.hash(password, 10);

  const admin = await prisma.utilisateur.create({
    data: {
      nom: process.env.SEED_ADMIN_NOM ?? 'Admin',
      prenom: process.env.SEED_ADMIN_PRENOM ?? 'Principal',
      email,
      motDePasse,
      role: 'ADMIN',
      actif: true,
    },
  });

  console.log(`Compte admin créé : ${admin.email} (id ${admin.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });