CORREÇÃO PWA — PrussikTrails

Copie os arquivos assim:

1) public/icon-192.png
2) public/icon-512.png
3) app/manifest.ts

Depois rode:

npm run build
git add app/manifest.ts public/icon-192.png public/icon-512.png
git commit -m "fix: adiciona manifest e icones PWA"
git push origin main

Depois do deploy, teste:
https://prussiktrails.vercel.app/icon-192.png
https://prussiktrails.vercel.app/icon-512.png
https://prussiktrails.vercel.app/manifest.webmanifest
