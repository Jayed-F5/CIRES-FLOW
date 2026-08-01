import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

if (environment.apiUrl.includes('REPLACE-ME')) {
  const message =
    "Configuration manquante : environment.prod.ts contient encore l'URL de remplacement. " +
    'Renseignez la véritable URL du backend de production avant de déployer.';
  document.body.innerHTML =
    `<div style="font-family: sans-serif; padding: 2rem; color: #b91c1c;">${message}</div>`;
  throw new Error(message);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
