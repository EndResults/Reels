# 🧪 FiT by Brendr.io - Testing Guide

Deze gids helpt je om het FiT platform stap voor stap te testen, zonder technische kennis.

## 📋 Voorbereiding (Eenmalig)

### Stap 1: Software Installeren
1. **Download en installeer Node.js**
   - Ga naar: https://nodejs.org
   - Download de "LTS" versie (aanbevolen)
   - Installeer met standaard instellingen

2. **Download en installeer Git** (optioneel)
   - Ga naar: https://git-scm.com
   - Download en installeer

### Stap 2: Project Voorbereiden
1. **Open Command Prompt (Windows) of Terminal (Mac)**
   - Windows: Druk `Windows + R`, typ `cmd`, druk Enter
   - Mac: Druk `Cmd + Space`, typ `Terminal`, druk Enter

2. **Navigeer naar je project map**
   ```
   cd C:\Users\ClintonEnd\dev\Projects\FiT
   ```

3. **Installeer backend dependencies**
   ```
   cd src\server
   npm install
   ```

4. **Installeer frontend dependencies**
   ```
   cd ..\client
   npm install
   ```

### Stap 3: Configuratie Voltooien
1. **Open het `.env` bestand in een teksteditor**
   - Locatie: `C:\Users\ClintonEnd\dev\Projects\FiT\.env`

2. **Vul deze verplichte velden in:**
   ```
   JWT_SECRET=mijn-super-geheime-sleutel-123456789
   STRIPE_SECRET_KEY=sk_test_jouw-stripe-test-key
   STRIPE_PUBLISHABLE_KEY=pk_test_jouw-stripe-test-key
   EMAIL_USER=jouw-email@gmail.com
   EMAIL_PASS=jouw-app-wachtwoord
   ```

## 🚀 Platform Starten

### Stap 1: Eerste Terminal - Backend Starten
1. **Open Command Prompt of PowerShell**
2. **Navigeer naar server map**
   ```
   cd C:\Users\ClintonEnd\dev\Projects\FiT\src\server
   ```

3. **Installeer dependencies (eerste keer)**
   ```
   npm install
   ```

4. **Start de backend server**
   ```
   npm run dev
   ```

5. **✅ Controleer of het werkt**
   - Je moet zien: `🚀 FiT Server running on port 3001`
   - En: `🔗 Health check: http://localhost:3001/health`

### Stap 2: Tweede Terminal - Frontend Starten
1. **Open een NIEUWE Command Prompt/PowerShell** (laat de eerste open!)
2. **Navigeer naar client map**
   ```
   cd C:\Users\ClintonEnd\dev\Projects\FiT\src\client
   ```

3. **Installeer dependencies (eerste keer)**
   ```
   npm install
   ```

4. **Start de frontend**
   ```
   npm run dev
   ```

5. **✅ Controleer of het werkt**
   - Je moet zien: `Local: http://localhost:3000/`
   - Browser opent automatisch

### Stap 3: Testen of Alles Werkt
1. **Ga naar:** http://localhost:3000
2. **Je moet zien:** "🎯 FiT by Brendr.io" pagina
3. **Test backend:** http://localhost:3001/health
4. **Je moet zien:** `{"status":"OK","timestamp":"..."}`

## 🧪 Platform Testen

### Test 1: Website Bezoeken
1. **Open je webbrowser**
2. **Ga naar:** `http://localhost:3000`
3. **Je ziet:** FiT homepage met logo en knoppen ✅

### Test 2: Retailer Account Aanmaken
1. **Klik op "Voor Retailers"**
2. **Klik op "Registreren"**
3. **Vul in:**
   - Email: `test-retailer@example.com`
   - Wachtwoord: `testtest123`
   - Voornaam: `Test`
   - Achternaam: `Retailer`
   - Webshop naam: `Test Shop`
   - Webshop URL: `https://testshop.com`
   - Type: `Fashion`
4. **Klik "Account Aanmaken"**
5. **Je ziet:** Retailer dashboard ✅

### Test 3: Consumer Account Aanmaken
1. **Open een nieuw browser tabblad**
2. **Ga naar:** `http://localhost:3000`
3. **Klik op "Inloggen"**
4. **Klik op "Registreren"**
5. **Vul in:**
   - Email: `test-user@example.com`
   - Wachtwoord: `testtest123`
   - Voornaam: `Test`
   - Achternaam: `User`
   - Geboortedatum: `1990-01-01`
   - Geslacht: `Male`
6. **Klik "Account Aanmaken"**
7. **Je ziet:** User dashboard ✅

### Test 4: Profielfoto Uploaden
1. **In het user dashboard**
2. **Klik op "Foto Uploaden"**
3. **Selecteer een foto van jezelf**
4. **Klik "Uploaden"**
5. **Je ziet:** Foto verschijnt in profiel ✅

### Test 5: FiT Widget Testen
1. **Ga naar retailer dashboard**
2. **Klik op "Integratie" tab**
3. **Kopieer de integratie code**
4. **Maak een test HTML bestand:**
   ```html
   <!DOCTYPE html>
   <html>
   <head><title>Test Shop</title></head>
   <body>
       <h1>Mijn Test Webshop</h1>
       <div class="product">
           <h2>Test Product</h2>
           <img src="https://via.placeholder.com/300" alt="Product">
           <p>€29.99</p>
           <!-- Plak hier de integratie code -->
       </div>
   </body>
   </html>
   ```
5. **Open het HTML bestand in browser**
6. **Je ziet:** FiT button op de pagina ✅

### Test 6: FiT Sessie Starten
1. **Klik op de FiT button**
2. **Login met je user account**
3. **Upload een foto**
4. **Vul product details in**
5. **Klik "Start FiT"**
6. **Je ziet:** "Processing..." status ✅

## ❌ Problemen Oplossen

### Backend start niet
- **Controleer:** Is Node.js geïnstalleerd?
- **Controleer:** Zijn alle dependencies geïnstalleerd? (`npm install`)
- **Controleer:** Is het `.env` bestand correct ingevuld?

### Frontend start niet
- **Controleer:** Draait de backend al?
- **Controleer:** Is poort 3000 vrij?
- **Probeer:** `npm run build` en dan `npm run preview`

### Database errors
- **Controleer:** Zijn de Supabase credentials correct?
- **Controleer:** Is de database schema geüpload?
- **Controleer:** Zijn de storage buckets aangemaakt?

### Email werkt niet
- **Controleer:** Gmail app-wachtwoord ingesteld?
- **Controleer:** 2-factor authenticatie aan?
- **Test:** Stuur een test email via Gmail

## 📞 Hulp Nodig?

### Logbestanden Bekijken
1. **Backend logs:** Kijk in de Command Prompt waar backend draait
2. **Frontend logs:** Druk F12 in browser, kijk naar "Console" tab
3. **Database logs:** Ga naar Supabase Dashboard > Logs

### Veelvoorkomende Fouten
- **"Port already in use"** → Sluit andere applicaties op dezelfde poort
- **"Module not found"** → Run `npm install` opnieuw
- **"Database connection failed"** → Controleer Supabase credentials
- **"CORS error"** → Controleer of backend en frontend beide draaien

### Contact
- **Email:** support@brendr.io
- **Discord:** FiT Community Server
- **GitHub:** Open een issue in de repository

---

🎉 **Gefeliciteerd!** Je hebt het FiT platform succesvol getest!
