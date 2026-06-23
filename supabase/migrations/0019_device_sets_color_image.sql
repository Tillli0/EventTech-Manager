-- EventTech Manager — Sets: Farbe & Bild
-- Sets bekommen eine Farbe (farbiger Rahmen in der UI) und optional ein Bild
-- (gespeichert im vorhandenen öffentlichen Bucket 'device-photos' unter sets/…).

alter table device_sets
  add column color text not null default '#6366f1',
  add column image_path text;
