# FiT Authentication Strategy

## Huidige Situatie
- **Retailers**: Custom `retailers` tabel met bcrypt wachtwoorden ✅
- **Users**: Custom `users` tabel (leeg/ongebruikt) ❌
- **Supabase Auth**: Beschikbaar maar niet gebruikt ❌

## Aanbevolen Hybride Aanpak

### Voor Retailers (B2B)
```
Supabase Auth (authenticatie) + Custom retailers tabel (business data)
```
- Supabase Auth voor login/wachtwoord management
- Custom `retailers` tabel voor: shop_name, shop_url, plan_type, subscriptions
- Voordelen: Email verificatie, wachtwoord reset, OAuth mogelijk

### Voor Users/Consumers (B2C)  
```
Volledig Supabase Auth
```
- Supabase Auth voor alles
- Metadata in auth.users.user_metadata
- Voordelen: Snelle implementatie, ingebouwde features

## Migratie Plan

### Stap 1: Retailers naar Supabase Auth
1. Maak Supabase Auth gebruikers voor bestaande retailers
2. Link via email/UUID
3. Behoud custom retailers tabel voor business data
4. Update auth routes

### Stap 2: Users volledig Supabase Auth
1. Implementeer Supabase Auth signup/login
2. Sla user data op in user_metadata
3. Verwijder custom users tabel

### Stap 3: Cleanup
1. Verwijder bcrypt dependencies
2. Update middleware
3. Implementeer RLS policies

## Voordelen Hybride Aanpak
- ✅ Email verificatie out-of-the-box
- ✅ Wachtwoord reset zonder custom SMTP
- ✅ OAuth providers (Google, Facebook)
- ✅ Betere beveiliging (Supabase managed)
- ✅ Minder code onderhoud
- ✅ Behoud custom business logic

## Implementatie Prioriteit
1. **Hoog**: Migreer retailers naar Supabase Auth
2. **Medium**: Implementeer users met Supabase Auth  
3. **Laag**: OAuth providers toevoegen
