-- Migration : suppression de 'a_contacter', ajout de 'en_closing'
-- À exécuter dans Supabase SQL Editor

-- 1. Clients "à contacter" → "nouveau" (pas encore d'action)
UPDATE clients
SET suivi_status = 'nouveau'
WHERE suivi_status = 'a_contacter';

-- 2. Clients "nouveau" qui ont déjà au moins une activité → "en_closing"
UPDATE clients
SET suivi_status = 'en_closing'
WHERE (suivi_status = 'nouveau' OR suivi_status IS NULL)
  AND id IN (
    SELECT DISTINCT client_id FROM activities
  );

-- Vérification
SELECT suivi_status, COUNT(*) FROM clients GROUP BY suivi_status ORDER BY suivi_status;
