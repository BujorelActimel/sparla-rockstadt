# Ghid setup pentru sparla

## Ce ai nevoie pe telefon

1. **Expo Go** - Descarca din App Store sau Google Play Store
2. **WhatsApp** - pentru a trimite rezultatele

## Cum sa rulezi aplicaaia acasa

### Pasul 1: dependente (ai nevoie de node si npm)
```bash
npm install

npm install -g expo-cli
```

### Pasul 2: Configureaza cheile API
Creeaza un fisier `.env` In folderul principal si adauga:
```
OPENAI_API_KEY=cheia_ta_openai_aici
WHATSAPP_NUMBER=numarul_la_care_sa_trimiti_rezultatul
```

### Pasul 3: Porneste aplicatia
```bash
npm start
```
sau
```bash
npx expo start
```

### Pasul 4: Conecteaza telefonul
1. Dupa ce rulezi `npm start`, vei vedea un QR code In terminal
2. Deschide **Expo Go** pe telefon
3. Scaneaza QR code-ul cu aplicatia Expo Go
4. Aplicatia se va incarca automat pe telefon

- !!! serverul si telefonul trebuie sa fie pe aceeasi retea

## Cum sa folosesti aplicatia

1. **Inregistreaza**: Apasa butonul de Inregistrare pentru a Incepe
2. **Opreste**: Apasa din nou pentru a opri Inregistrarea
3. **Asteapta**: Aplicatia va analiza audio-ul si va identifica melodia
4. **Partajeaza**: Foloseste butonul WhatsApp pentru a partaja rezultatul
