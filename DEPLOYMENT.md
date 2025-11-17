# Deployment Instrukcije za Squart

Ovaj projekat je Vite aplikacija koja se build-uje u statički sajt. Evo nekoliko opcija za deployment:

## 🚀 Opcije za Deployment

### 1. Vercel (Preporučeno)

**Najlakši način:**
1. Idite na [vercel.com](https://vercel.com) i prijavite se sa GitHub/GitLab/Bitbucket
2. Kliknite "New Project"
3. Importujte vaš repozitorijum
4. Vercel će automatski detektovati Vite projekat
5. Kliknite "Deploy"

**Build Settings (automatski detektovano):**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Deployment preko CLI:**
```bash
npm i -g vercel
vercel
```

### 2. Netlify

**Najlakši način:**
1. Idite na [netlify.com](https://netlify.com) i prijavite se
2. Kliknite "Add new site" → "Import an existing project"
3. Povežite vaš Git repozitorijum
4. Netlify će automatski koristiti `netlify.toml` konfiguraciju
5. Kliknite "Deploy site"

**Drag & Drop:**
```bash
npm run build
# Zatim drag & drop dist/ folder na Netlify dashboard
```

**Deployment preko CLI:**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### 3. GitHub Pages

**Setup:**
1. Dodajte `deploy` skriptu u `package.json`:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

2. Instalirajte gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

3. Pokrenite deployment:
   ```bash
   npm run deploy
   ```

4. U GitHub repozitorijumu, idite na Settings → Pages i postavite source na `gh-pages` branch

**Napomena:** Možda ćete morati da promenite `base` u `vite.config.js` na vaš repo path:
```js
base: '/squart/', // zamenite 'squart' sa imenom vašeg repozitorijuma
```

### 4. Cloudflare Pages

1. Idite na [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Kliknite "Pages" → "Create a project"
3. Povežite vaš Git repozitorijum
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Kliknite "Save and Deploy"

### 5. Surge.sh

```bash
npm install -g surge
npm run build
cd dist
surge
# Unesite domen (ili koristite random)
```

## 📝 Pre Deployment Checklist

- [ ] Testirajte build lokalno: `npm run build && npm run preview`
- [ ] Proverite da li sve rute rade (ako imate routing)
- [ ] Proverite da li su svi assets učitani
- [ ] Testirajte na različitim browserima
- [ ] Proverite da li Three.js renderer radi kako treba

## 🔧 Troubleshooting

**Problem:** Blank stranica nakon deployment-a
- Rešenje: Proverite da li je `base` u `vite.config.js` postavljen na `'./'` ili pravi path

**Problem:** 404 na refresh
- Rešenje: Konfiguracije za Netlify i Vercel već imaju redirect pravila u `netlify.toml` i `vercel.json`

**Problem:** Assets se ne učitavaju
- Rešenje: Proverite da li su svi putanje relativne i da `base` u vite.config.js je postavljen pravilno

## 🌐 Preporučeni Workflow

1. **Development:** `npm run dev`
2. **Test Build:** `npm run build && npm run preview`
3. **Deploy:** Push na main branch (automatski deployment) ili ručno deploy

## 📚 Dodatni Resursi

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)

