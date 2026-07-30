# Mynd — guida al setup (passo per passo)

Come funziona il sito, in breve: è tutto fatto di **file statici** (HTML/CSS/JS),
ospitati gratis su **Netlify**, distribuiti attraverso la sua rete globale (CDN).
Non c'è un server tradizionale da mantenere, quindi non c'è quasi nulla che un
attacco possa "far cadere" — ed è per questo che è anche il tipo di
architettura più resistente ai DDoS che esista, senza dover configurare nulla
di speciale.

Gli articoli vivono come file JSON dentro il repository GitHub del sito. Il
pannello admin non scrive direttamente su GitHub: chiama una piccola funzione
che gira sui server di Netlify (gratis anch'essa), che è l'unico posto dove
esiste il "permesso" per scrivere sul repository. Così il permesso non è mai
visibile a chi apre il sito.

---

## 1. Crea il repository GitHub

1. Vai su github.com → **New repository** → chiamalo ad es. `mynd-blog` →
   **Public** o **Private** (indifferente) → Create.
2. Carica tutti i file di questo progetto nel repository (puoi trascinarli
   nell'interfaccia web di GitHub, oppure con Git da terminale se preferisci).

## 2. Collega il repository a Netlify

1. Vai su netlify.com → registrati con l'account GitHub.
2. **Add new site → Import an existing project → GitHub** → scegli `mynd-blog`.
3. Build command: lascia vuoto. Publish directory: `.` (la cartella principale).
4. Deploy site.

Dopo qualche secondo il sito è online su un indirizzo tipo
`https://nome-a-caso.netlify.app` (puoi cambiarlo in Site settings → Domain).

## 3. Crea il token GitHub (permesso di scrittura)

1. Su GitHub: icona profilo → **Settings → Developer settings → Personal
   access tokens → Fine-grained tokens → Generate new token**.
2. Dai accesso **solo** al repository `mynd-blog` (non a tutti i tuoi repo).
3. Permessi: **Contents: Read and write**.
4. Genera e copia il token (non lo rivedrai più).

## 4. Imposta le variabili d'ambiente su Netlify

Su Netlify: **Site configuration → Environment variables → Add a variable**.
Aggiungi queste quattro:

| Nome | Valore |
|---|---|
| `ADMIN_PASSWORD` | una password a tua scelta, solo per te |
| `GITHUB_TOKEN` | il token creato al punto 3 |
| `GITHUB_REPO` | `tuo-username/mynd-blog` |
| `GITHUB_BRANCH` | `main` (o il nome del tuo branch principale) |

Dopo averle salvate: **Deploys → Trigger deploy** per farle applicare.

## 5. Pubblica il tuo primo articolo

Vai su `https://il-tuo-sito.netlify.app/admin/` → inserisci la password → scrivi
l'articolo → **Pubblica articolo**. Dopo circa un minuto (tempo di ripubblicazione
automatica) l'articolo appare in home.

## 6. Condividere su Instagram

Su ogni articolo c'è il pulsante **"Genera storia Instagram"**: scarica
un'immagine 1080×1920 già pronta (foto + titolo + logo) e copia automaticamente
il link dell'articolo. Apri Instagram → Storia → carica l'immagine → incolla il
link come sticker "link". Instagram non consente la pubblicazione *automatica*
di storie da siti esterni senza un'app Business approvata da Meta (processo
lungo, pensato per aziende), quindi questo è il flusso più semplice e gratuito
possibile: due tap invece di zero, ma senza dover chiedere permessi a Meta.

---

## Note sulla sicurezza (onestà, non marketing)

- **DDoS**: essendo un sito statico su CDN, la protezione di base è già molto
  solida. Se in futuro vuoi un livello ulteriore (gratis anch'esso), puoi
  mettere **Cloudflare** davanti al dominio: Domain → aggiungi il dominio su
  Cloudflare → cambi i nameserver → attivi "Under Attack Mode" solo se serve.
  Non è indispensabile per iniziare.
- **Password admin**: è un controllo semplice, adatto a un blog personale a
  basso traffico — non è un vero sistema di login con utenti/sessioni. Non
  condividere il link `/admin/` pubblicamente e usa una password che non usi
  altrove. Se un giorno il token GitHub dovesse trapelare, revocalo subito da
  GitHub e generane uno nuovo.
- Il repository può restare **privato**: il sito pubblico funziona comunque,
  perché Netlify lo legge direttamente da GitHub in fase di build.

## Struttura del progetto

```
index.html              homepage con elenco articoli
articolo.html           pagina di un singolo articolo
admin/                  pannello di pubblicazione
content/index.json      elenco degli slug pubblicati
content/articles/*.json un file per articolo
content/images/         copertine caricate dal pannello
netlify/functions/publish.js   funzione che scrive su GitHub
css/style.css           stile del sito
js/                      logica di homepage, articolo, generatore storie
```
