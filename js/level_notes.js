/* Gemüsemonster – Texte für Sammelkarten und Feldnotizen (rein erzählerisch, keine Ernährungsratschläge).
   Je Monster: Spruch für die Karte und drei Feldnotizen (1: entdeckt · 2: letzte Form · 3: 10 Begegnungen). */
'use strict';
const LV_NOTES = {
  moehri: { q: '„Erst springen, dann nachdenken.“', n: ['Möhri wächst kopfüber im Boden auf und hält deshalb alles für möglich.', 'Möhrgons Wurzelpeitsche ist eigentlich nur ein sehr langer Schnürsenkel.', 'Wenn es regnet, gräbt sich Möhri bis zu den Knöcheln ein und summt.'] },
  erbsi: { q: '„Zusammen sind wir eine Schote.“', n: ['Erbsi ist nie allein – in der Schote warten immer noch Geschwister.', 'Schotadors Schild ist ein besonders zähes Blatt aus dem eigenen Garten.', 'Erbsi zählt beim Purzelbaum laut mit. Meistens bis drei.'] },
  tomi: { q: '„Ich bin nicht wütend. Ich bin reif.“', n: ['Tomi wird rot, wenn man es lobt – und auch, wenn nicht.', 'Tomagma trägt die Sommerhitze von hundert Gewächshäusern in sich.', 'Wer Tomi antippt, bekommt ein Wackeln wie von frischem Pudding.'] },
  brokki: { q: '„Zzz … nur fünf Minuten …“', n: ['Brokki schläft am liebsten im Halbschatten unter großen Blättern.', 'In Brokkolos’ Krone wohnt ein kleiner Vogel, der nie Miete zahlt.', 'Brokki schreckt hoch, sobald jemand „Mittag“ sagt.'] },
  kuerbi: { q: '„HAHAHA – Lachanfall in 3, 2, 1 …“', n: ['Kürbi kichert schon, bevor der Witz anfängt.', 'Kürbrocks Lachen leuchtet so hell, dass Glühwürmchen neidisch werden.', 'Im Herbst lädt Kürbi alle zum Kürbiskernspucken ein.'] },
  pepi: { q: '„Ich bin nicht schüchtern. Ich beobachte.“', n: ['Pepi versteckt sich hinter dem eigenen Stiel, wenn Fremde kommen.', 'Paprisma wechselt die Farbe je nach Laune: rot, gelb, grün.', 'Mit genug Geduld zeigt Pepi dir sein Lieblingsbeet.'] },
  radl: { q: '„Wer zuerst da ist, hat gewonnen!“', n: ['Radl hüpft lieber, als zu gehen – das spart Zeit.', 'Radirex hält den Rekord im Beet-Sprint, gemessen mit einer Schnecke.', 'Radl hat nie still gestanden. Außer einmal, zum Gähnen.'] },
  zwibbel: { q: '„Das ist kein Weinen, das ist Gefühl in Schichten.“', n: ['Zwibbel hat sieben Schichten und unter jeder ein Taschentuch.', 'Zwiebolons Tränenflut hat schon zwei Gießkannen ersetzt.', 'Wer Zwibbel tröstet, bekommt einen Platz im ersten Beet.'] },
  gurki: { q: '„Bleib cool. Wie eine Gurke.“', n: ['Gurki trägt die Sonnenbrille auch nachts. Sicher ist sicher.', 'Gurkodil schnappt nie zu – es klappert nur dramatisch mit dem Kiefer.', 'Gurki lehnt sich an jede Wand, die es findet.'] },
  aubi: { q: '„Man nennt mich Eure Violettheit.“', n: ['Aubi hebt die Nase so hoch, dass es oft über Steine stolpert.', 'Aubzars Zepter ist in Wahrheit ein sehr eleganter Stiel.', 'Hinter dem Monokel versteckt Aubi ein freundliches Zwinkern.'] },
  sprossi: { q: '„Bzzzt! Schon wieder gewachsen.“', n: ['Sprossi lädt sich auf, indem es in der Morgensonne steht.', 'Sparxions Spargelblitz zeigt den Weg durch dunkle Beete.', 'Sprossi kribbelt, wenn ein Gewitter kommt.'] },
  spori: { q: '„Hatschi! Oh – neue Freunde.“', n: ['Wo Spori niest, wachsen am nächsten Morgen kleine Pilze.', 'Myzelor ist unter der Erde mit dem ganzen Wald verbunden.', 'Spori träumt in Sporenwolken und erinnert sich an jeden Traum.'] },
  beti: { q: '„Dreh dich – dann siehst du mehr.“', n: ['Beti dreht Pirouetten, bis der Garten rosa schimmert.', 'Bettrix’ Hut verbirgt einen Spiralzauber, der nie langweilig wird.', 'Niemand weiß, woher Beti kommt. Beti auch nicht.'] },
  lauchling: { q: '„Wer langsam wächst, wächst hoch.“', n: ['Lauchling grüßt jeden Gast mit einem höflichen Nicken.', 'Merlauchs Stab war früher ein Lauch, der gern zuhörte.', 'Lauchling kennt die Namen aller Pflanzen im Garten.'] },
  ingi: { q: '„Scharf? Ich bin nur gut gelaunt.“', n: ['Ingi sprüht Funken, wenn es sich freut – also ständig.', 'Ingwars Schlachtruf weckt sogar Brokki aus dem Mittagsschlaf.', 'Ingi wärmt an kalten Tagen die Hände der anderen.'] },
  knobi: { q: '„Unwiderstehlich. Riechbar unwiderstehlich.“', n: ['Knobi ist mutiger, als seine Größe vermuten lässt.', 'Graf Knobula verbeugt sich vor jedem Gast und zeigt dabei seine Zähnchen.', 'Knobi hält Mücken auf Abstand, ohne es zu wollen.'] },
  kichi: { q: '„Wer allein kichert, kichert nur halb.“', n: ['Kichi kullert lieber, als zu gehen.', 'Kicherons zwei Kleine sind Geschwister aus derselben Schote.', 'Wenn Kichi lacht, lachen bald alle im Beet mit.'] },
  maisi: { q: '„Pop! Pop! Pop!“', n: ['Maisi hüpft bei Sonnenschein auf und ab wie ein Flummi.', 'Kolbrix macht aus jeder Überraschung eine Popcorn-Explosion.', 'Maisi zählt seine Körner, verzählt sich aber immer bei siebzehn.'] },
  kohli: { q: '„Ich denke, also wackel ich.“', n: ['Kohli wackelt mit dem ganzen Kopf, wenn es nachdenkt.', 'Kohlossus hatte schon drei Geistesblitze – alle an einem Dienstag.', 'Kohli mag Regen, weil es dann glänzt.'] },
  morchi: { q: '„Ich bin nicht hier. Du siehst nur meine Kappe.“', n: ['Morchi versteckt sich unter der Kappe, bis es sich sicher fühlt.', 'Morchelor tanzt nachts Walzer mit den Sporen.', 'Wer Morchi findet, darf sich etwas wünschen. Sagt Morchi.'] },
  erntor: { q: '„Ein Jahr Erntezeit trägt Flügel.“', n: ['Erntor erscheint nur denen, die ein ganzes Jahr dabeibleiben.', 'Seine Flügel sind aus Herbstlaub, das nie welkt.', 'Erntor kennt jeden Tag des Jahres beim Namen.'] },
  rhizowal: { q: '„Tief unten wächst das meiste.“', n: ['Rhizowal schwimmt durch die Wurzeln unter dem Garten.', 'Seine Fontäne gießt drei Beete auf einmal.', 'Rhizowal singt so tief, dass nur Kartoffeln es hören.'] },
  solarion: { q: '„Jeder Tag hat eine Sonnenseite.“', n: ['Solarion folgt der Sonne von morgens bis abends.', 'Sein Brüllen klingt wie ein warmer Sommerwind.', 'Wo Solarion schläft, wachsen am nächsten Tag Sonnenblumen.'] },
};
// Was einen Typ anlockt (nur Erklärung; gezählt wird, OB es vorkam, nie wie viel)
const LV_LURE = {
  Blatt: 'Spinat, Salat, Kohl, Brokkoli, Mangold, Rucola', Frucht: 'Tomate, Paprika, Gurke, Kürbis, Aubergine, Obst',
  Wurzel: 'Möhre, Rote Bete, Radieschen, Kartoffel, Ingwer', Zwiebel: 'Zwiebel, Knoblauch, Lauch, Schalotte',
  'Hülse': 'Linsen, Kichererbsen, Bohnen, Erbsen, Tofu', Spross: 'Spargel, Mais, Sprossen, Kohlrabi, Fenchel', Pilz: 'Champignons, Shiitake, Pfifferlinge',
};
