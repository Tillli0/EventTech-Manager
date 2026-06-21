-- Storage: device-photos bucket auf public setzen,
-- damit Bildvorschauen ohne Auth-Header funktionieren (lokaler No-Login-Betrieb).
update storage.buckets set public = true where id = 'device-photos';
