import type { TopicPair, Zitat } from '../types';

export const SEED_TOPIC_PAIRS: TopicPair[] = [
  // ══════════════════════════════════════════════════
  // Liste A — 15 Variante
  // ══════════════════════════════════════════════════
  {
    id: 'A1', variante: 'A — Variante 1',
    topic_a: { title: 'Bücher und Glück', prompt: 'Bücher geben Anleitungen zum Glücklichsein, und von manchen Menschen wird behauptet, sie hätten das Glück gepachtet. Was ist für Sie Glück, und welchen Stellenwert hat es in Ihrem Leben? Erläutern Sie Ihre Vorstellungen.', tips: ['Definition von Glück erklären', 'Persönliche Erfahrungen einbeziehen', 'Stellenwert im Alltag beschreiben'] },
    topic_b: { title: 'Arbeitsfreies Leben', prompt: 'Würden Sie auch arbeiten, wenn Sie finanziell nicht darauf angewiesen wären? Schildern Sie Ihre Gedanken zum Thema arbeitsfreies Leben.', tips: ['Eigene Motivation reflektieren', 'Vor- und Nachteile abwägen', 'Persönliche Meinung formulieren'] }
  },
  {
    id: 'A2', variante: 'A — Variante 2',
    topic_a: { title: 'Fremde Bräuche in Deutschland', prompt: 'Halloween oder das indische Frühlingsfest Holi – in Deutschland werden Bräuche aus anderen Kulturkreisen immer populärer. Schildern Sie Ihre Überlegungen zur Übernahme von fremden Bräuchen. Berichten Sie auch von eigenen Erfahrungen.', tips: ['Beispiele nennen', 'Kulturellen Austausch bewerten', 'Eigene Erfahrungen einbringen'] },
    topic_b: { title: 'Persönliche Schilderungen als Geschichtsquelle', prompt: 'Unsere Eltern und Großeltern können aus eigener Erfahrung von historischen Ereignissen berichten. Erachten Sie persönliche Schilderungen als vertrauenswürdige Quelle für Geschichtswissen? Legen Sie Ihre Überlegungen zu dieser Frage dar.', tips: ['Vor- und Nachteile mündlicher Überlieferung', 'Vergleich mit anderen Quellen', 'Eigene Position begründen'] }
  },
  {
    id: 'A3', variante: 'A — Variante 3',
    topic_a: { title: 'Gehälter im Spitzensport', prompt: 'Heutzutage werden im Spitzensport sehr hohe Gagen bezahlt. Finden Sie es richtig, dass Spitzensportler, z.B. Tennisspieler oder Fußballer, so viel Geld verdienen? Erläutern Sie Ihren Standpunkt. Oder: Finden Sie es gerecht, dass Spitzensportler so viel verdienen?', tips: ['Argumente für und gegen hohe Gehälter', 'Vergleich mit anderen Berufen', 'Gerechtigkeit diskutieren'] },
    topic_b: { title: 'Lotto und Glücksspiel', prompt: 'Sind Sie gegen das Spiel Lotto und mit der Entfernung dieses Spiels und seiner Arten? Was sind die Gründe? Erklären Sie Ihre Sichtweise und Meinung.', tips: ['Soziale Auswirkungen', 'Sucht und Risiken', 'Staatliche Regulierung'] }
  },
  {
    id: 'A4', variante: 'A — Variante 4',
    topic_a: { title: 'Architektur und Stadtbild', prompt: 'Wie kann Architektur das Aussehen von Städten prägen? Geben Sie Beispiele.', tips: ['Konkrete Beispiele aus Städten', 'Einfluss auf Identität und Tourismus', 'Moderne vs. historische Architektur'] },
    topic_b: { title: 'Wichtige Berufsgruppen', prompt: 'Welche Berufsgruppe halten Sie für besonders wichtig? Begründen Sie Ihre Meinung.', tips: ['Kriterien für Wichtigkeit definieren', 'Vergleich mehrerer Berufsgruppen', 'Gesellschaftliche Bedeutung'] }
  },
  {
    id: 'A5', variante: 'A — Variante 5',
    topic_a: { title: 'Berufsprestige', prompt: 'Welche Berufe haben ein besonders hohes, welche ein besonders niedriges Prestige in Ihrem Herkunftsland (oder einem anderen Land Ihrer Wahl)? Wie kommen solche Prestigeunterschiede Ihrer Meinung nach zustande?', tips: ['Beispiele aus dem Heimatland', 'Historische und kulturelle Gründe', 'Vergleich mit Deutschland'] },
    topic_b: { title: 'Abfallentsorgung und Recycling', prompt: 'Wie sind Abfallentsorgung und Recycling in Ihrem Herkunftsland organisiert? Welche Unterschiede gibt es zu Deutschland? Berichten Sie.', tips: ['Konkrete Beispiele', 'Stärken und Schwächen vergleichen', 'Verbesserungsvorschläge'] }
  },
  {
    id: 'A6', variante: 'A — Variante 6',
    topic_a: { title: 'Tierschutz', prompt: 'Welche Rolle spielt der Tierschutz in einem Land Ihrer Wahl? Erläutern Sie dies anhand von Beispielen.', tips: ['Gesetze und Regelungen', 'Gesellschaftliche Einstellung', 'Konkrete Beispiele'] },
    topic_b: { title: 'Medien und Vertrauen', prompt: 'Wie informieren die Medien in einem Land Ihrer Wahl über aktuelle Themen? Inwieweit vertrauen Sie der Berichterstattung? Erläutern Sie Ihre Haltung zu dieser Frage.', tips: ['Verschiedene Medienformen', 'Objektivität und Glaubwürdigkeit', 'Persönliche Erfahrungen'] }
  },
  {
    id: 'A7', variante: 'A — Variante 7',
    topic_a: { title: 'Altersvorsorge', prompt: 'Ist Altersvorsorge allein Aufgabe des Staates oder sollte jeder auch selbst dafür sorgen, dass er im Alter seinen Lebensunterhalt bestreiten kann? Legen Sie Ihre Überlegungen zu dieser Frage dar.', tips: ['Staatliche vs. private Verantwortung', 'Rentensystem erklären', 'Persönliche Meinung'] },
    topic_b: { title: 'Sport in sensiblen Umgebungen', prompt: 'Für den Skisport werden Lebensräume der Tierwelt zerstört. Mountainbiker fahren durch die Wälder, Klettertouristen verschmutzen das Hochgebirge. Ist Sport in sensiblen Umgebungen zu verantworten? Erläutern Sie Ihre Meinung.', tips: ['Umweltauswirkungen', 'Freizeitrecht vs. Naturschutz', 'Lösungsvorschläge'] }
  },
  {
    id: 'A8', variante: 'A — Variante 8',
    topic_a: { title: 'Medizinischer Fortschritt', prompt: 'Manche Menschen behaupten, der medizinische Fortschritt sei mehr Fluch als Segen. Teilen Sie diese Ansicht? Begründen Sie Ihren Standpunkt anhand von Beispielen.', tips: ['Vorteile des Fortschritts', 'Ethische Probleme', 'Eigene Position'] },
    topic_b: { title: 'Soziales Engagement', prompt: 'Sind Sie der Meinung, dass jede oder jeder Jugendliche sich sozial engagieren sollte? Erläutern Sie Ihre Meinung. Sie können auch von eigenen Erfahrungen berichten.', tips: ['Bedeutung des Ehrenamts', 'Pflicht oder Freiwilligkeit?', 'Eigene Erfahrungen'] }
  },
  {
    id: 'A9', variante: 'A — Variante 9',
    topic_a: { title: 'Kinderfeindliche Gesellschaft?', prompt: 'Mitunter wird der Vorwurf erhoben, unsere Gesellschaft sei kinderfeindlich. Entspricht das Ihrem persönlichen Empfinden? Schildern Sie Erfahrungen und Beobachtungen. Sie können auch mit der Einstellung gegenüber Kindern in einem Land Ihrer Wahl vergleichen.', tips: ['Eigene Beobachtungen', 'Vergleich mit anderen Ländern', 'Mögliche Ursachen'] },
    topic_b: { title: 'Heilpraktiker vs. Ärzte', prompt: 'Viele Menschen vertrauen Heilpraktikern, während andere sie als Scharlatane abtun. Sind Sie der Ansicht, dass das Heilen allein Ärztinnen und Ärzten vorbehalten sein sollte? Erläutern Sie Ihre Haltung. Berichten Sie auch von eigenen Erfahrungen.', tips: ['Wissenschaft vs. Alternativmedizin', 'Persönliche Erfahrungen', 'Regulierung'] }
  },
  {
    id: 'A10', variante: 'A — Variante 10',
    topic_a: { title: 'Kindheit Land vs. Stadt', prompt: 'Sind Sie der Meinung, dass Kinder auf dem Land eine schönere Kindheit haben als solche, die in einer Großstadt aufwachsen? Begründen Sie Ihre Ansicht und berichten Sie von eigenen Erfahrungen.', tips: ['Vor- und Nachteile beider Umgebungen', 'Persönliche Kindheitserfahrungen', 'Gesellschaftliche Entwicklungen'] },
    topic_b: { title: 'Demonstrationen', prompt: 'Immer wieder gehen Menschen auf die Straße, um die Öffentlichkeit auf bestimmte Anliegen aufmerksam zu machen. Betrachten Sie Demonstrationen als wirksames Mittel zur Meinungsäußerung? Erläutern Sie Ihre Haltung zu dieser Frage.', tips: ['Beispiele erfolgreicher Demos', 'Demokratische Bedeutung', 'Grenzen und Risiken'] }
  },
  {
    id: 'A11', variante: 'A — Variante 11',
    topic_a: { title: 'Handyverbot an Schulen', prompt: 'Soll es ein generelles Handyverbot an den Schulen geben?', tips: ['Bildungsaspekte diskutieren', 'Vor- und Nachteile abwägen', 'Alternativen vorschlagen'] },
    topic_b: { title: 'Erfolgreiche Menschen', prompt: 'Was macht für Sie einen erfolgreichen Menschen aus? Schildern Sie Ihre Überlegungen zu dieser Frage.', tips: ['Definition von Erfolg', 'Verschiedene Aspekte', 'Eigene Werte darstellen'] }
  },
  {
    id: 'A12', variante: 'A — Variante 12',
    topic_a: { title: 'Kunstförderung durch den Staat', prompt: 'Sind Sie der Meinung, dass der Staat die Kunst fördern (unterstützen) sollte?', tips: ['Kulturelle Bedeutung der Kunst', 'Staatliche vs. Markt', 'Konkrete Beispiele'] },
    topic_b: { title: 'Kunstförderung — private Angelegenheit?', prompt: 'Kunst ist jahrhundertelang von Mäzenen und nicht vom Staat gefördert worden. Sind Sie der Meinung, dass Kunstförderung eine private Angelegenheit ist? Begründen Sie Ihre Haltung zu dieser Frage.', tips: ['Geschichte der Kunstförderung', 'Vor- und Nachteile beider Modelle', 'Aktuelle Beispiele'] }
  },
  {
    id: 'A13', variante: 'A — Variante 13',
    topic_a: { title: 'Elternpflege — Pflicht der Kinder?', prompt: 'Sind Sie der Ansicht, dass Kinder unter allen Umständen für die Pflege ihrer Eltern zuständig sind?', tips: ['Kulturelle und familiäre Werte', 'Staatliche Unterstützungssysteme', 'Persönliche Erfahrungen'] },
    topic_b: { title: 'Spieltrends', prompt: 'Spieltrends wandeln sich mit der Zeit. Welchen Stellenwert sollte das Spiel im Leben eines Menschen haben?', tips: ['Bedeutung des Spiels für alle Altersgruppen', 'Digitale vs. traditionelle Spiele', 'Gesellschaftlicher Wandel'] }
  },
  {
    id: 'A14', variante: 'A — Variante 14',
    topic_a: { title: '24 Stunden eine andere Person sein', prompt: 'Wenn du einen anderen Menschen 24 Stunden lang sein würdest — was tun? Warum? Stell dir das vor.', tips: ['Kreativ und persönlich antworten', 'Begründung für die Wahl', 'Was würde man lernen oder erleben?'] },
    topic_b: { title: 'Erfolgreiche Menschen (Variante)', prompt: 'Was macht für Sie einen erfolgreichen Menschen aus? Schildern Sie Ihre Überlegungen zu dieser Frage.', tips: ['Definition von Erfolg erklären', 'Verschiedene Aspekte (beruflich, persönlich)', 'Eigene Werte darstellen'] }
  },
  {
    id: 'A15', variante: 'A — Variante 15',
    topic_a: { title: 'Prominente beurteilen', prompt: 'Sollte man Prominente nur an ihrer beruflichen Leistung oder auch an ihren Einstellungen bzw. ihrem Verhalten messen? Begründen Sie Ihre Ansicht. Sie können auch bekannte Beispiele anführen.', tips: ['Vorbildfunktion', 'Privatsphäre vs. Verantwortung', 'Bekannte Beispiele'] },
    topic_b: { title: 'Nachbarschaft in Städten', prompt: 'Wird in unseren Städten der Kontakt zu den Nachbarn vernachlässigt? Erläutern Sie Ihre Ansichten zum Thema Nachbarschaft. Vergleichen Sie auch mit einem Land Ihrer Wahl.', tips: ['Urbanisierung und Anonymität', 'Gemeinschaftsgefühl', 'Kultureller Vergleich'] }
  },

  // ══════════════════════════════════════════════════
  // Liste B — 15 Variante
  // ══════════════════════════════════════════════════
  {
    id: 'B1', variante: 'B — Variante 1',
    topic_a: { title: 'Fernsehserien', prompt: 'Fernsehserien und Serien zum Herunterladen liegen zurzeit sehr im Trend; manche Menschen schauen sie täglich. Wie erklären Sie sich die Faszination, die von Serien ausgeht? Berichten Sie von Ihren Erfahrungen und Beobachtungen.', tips: ['Psychologische Gründe nennen', 'Persönliche Seherfahrungen', 'Vor- und Nachteile der Seriensucht'] },
    topic_b: { title: 'Beschäftigt sein als Statussymbol', prompt: 'Heutzutage scheint es schick zu sein, sich extrem beschäftigt oder gestresst zu zeigen. Selbst Entspannungszeiten sind häufig durchorganisiert, und Nichtstun ist verpönt. Welchen Stellenwert sollte Untätigkeit haben? Erläutern Sie Ihre Ansicht.', tips: ['Gesellschaftlichen Druck beschreiben', 'Bedeutung von Pausen', 'Work-Life-Balance'] }
  },
  {
    id: 'B2', variante: 'B — Variante 2',
    topic_a: { title: 'Ausstieg aus der Gesellschaft', prompt: 'Manche Menschen möchten sich den Zwängen entziehen und suchen alternative Lebensformen in einer fremden Umgebung. Ist Aussteigen für Sie eine nachvollziehbare Haltung? Begründen Sie Ihre Meinung.', tips: ['Gründe für den Ausstieg', 'Gesellschaftliche Normen', 'Persönliche Meinung'] },
    topic_b: { title: 'Späte Mutterschaft', prompt: 'Der Zeitpunkt, zu dem Frauen in Deutschland ihr erstes Kind bekommen, verschiebt sich immer weiter nach hinten. Sehen Sie darin eine positive Entwicklung? Erläutern Sie Ihre Meinung zu dieser Frage.', tips: ['Gründe für späte Mutterschaft', 'Vor- und Nachteile', 'Gesellschaftliche Veränderungen'] }
  },
  {
    id: 'B3', variante: 'B — Variante 3',
    topic_a: { title: 'Du oder Sie — Anredeformen', prompt: 'Für jüngere Menschen ist das Duzen ganz normal, während ältere Menschen eher beim Sie bleiben. Sind Sie der Meinung, dass das Siezen überholt ist? Schildern Sie Ihre Meinung. Vergleichen Sie mit einem Land Ihrer Wahl.', tips: ['Kulturelle Bedeutung der Anredeformen', 'Generationsunterschiede', 'Internationaler Vergleich'] },
    topic_b: { title: 'Tierversuche', prompt: 'Sollten Tierversuche verboten werden?', tips: ['Wissenschaftliche Notwendigkeit', 'Ethische Bedenken', 'Alternativen zu Tierversuchen'] }
  },
  {
    id: 'B4', variante: 'B — Variante 4',
    topic_a: { title: 'Werbung', prompt: 'Welche positiven und negativen Funktionen hat Werbung? Erläutern Sie dies anhand von Beispielen.', tips: ['Informationsfunktion vs. Manipulation', 'Konkrete Beispiele aus dem Alltag', 'Regulierung der Werbung'] },
    topic_b: { title: 'Literarisches Werk', prompt: 'Beschreiben Sie ein Werk aus der Literatur. Wie schätzen Sie seine Bedeutung ein?', tips: ['Inhalt kurz zusammenfassen', 'Themen und Botschaften', 'Persönliche Bewertung begründen'] }
  },
  {
    id: 'B5', variante: 'B — Variante 5',
    topic_a: { title: 'Musik und ihre Bedeutung', prompt: 'Welche Bedeutung hat die Musik in Ihrem Herkunftsland (oder einem Land Ihrer Wahl)? Warum ist Musik wichtig – für den einzelnen Menschen und für die Gesellschaft?', tips: ['Kulturelle Rolle der Musik', 'Persönliche Beziehung zur Musik', 'Gesellschaftliche Funktion'] },
    topic_b: { title: 'Naturschutz im Heimatland', prompt: 'Welche Rolle spielt der Naturschutz in Ihrem Herkunftsland (oder einem Land Ihrer Wahl)? Welche Maßnahmen werden ergriffen, um die Natur zu schützen, und wie effektiv sind sie?', tips: ['Konkrete Maßnahmen beschreiben', 'Erfolge und Misserfolge', 'Vergleich mit Deutschland'] }
  },
  {
    id: 'B6', variante: 'B — Variante 6',
    topic_a: { title: 'Pflege alter Menschen', prompt: 'Wir leben immer länger, und die Pflege im Alter wird zu einem wichtigen Thema. Sind Sie der Auffassung, dass der Staat für die Betreuung alter Menschen verantwortlich ist? Legen Sie Ihre Ansichten dar und stellen Sie Vergleiche mit einem Land Ihrer Wahl an.', tips: ['Staatliche vs. familiäre Verantwortung', 'Pflegesysteme vergleichen', 'Eigene Erfahrungen'] },
    topic_b: { title: 'Städtischer Gartenbau', prompt: 'In vielen Industrieländern findet das Konzept des städtischen Gartenbaus immer mehr Anklang. Denken Sie, dass Selbstversorgung durch Anbau auf Dachgärten und an Fassaden sinnvoll ist? Schildern Sie Ihre Überlegungen zu diesem Thema.', tips: ['Nachhaltigkeitsaspekte', 'Praktische Herausforderungen', 'Gesellschaftlicher Nutzen'] }
  },
  {
    id: 'B7', variante: 'B — Variante 7',
    topic_a: { title: 'Bildungssystem', prompt: 'Beschreiben Sie das Bildungssystem in einem Land Ihrer Wahl. Was funktioniert gut, und wo sehen Sie Verbesserungsbedarf?', tips: ['Struktur des Bildungssystems erklären', 'Stärken und Schwächen benennen', 'Verbesserungsvorschläge machen'] },
    topic_b: { title: 'Rollen von Männern und Frauen', prompt: 'Welche Rollen spielen Männer und Frauen in einem Land Ihrer Wahl in der Gesellschaft und in der Familie?', tips: ['Traditionelle und moderne Rollen', 'Wandel im Laufe der Zeit', 'Persönliche Meinung'] }
  },
  {
    id: 'B8', variante: 'B — Variante 8',
    topic_a: { title: 'Sportvereine und Allgemeinwohl', prompt: 'Vertreten Sie die Auffassung, dass Sportvereine dem Allgemeinwohl dienen und von der öffentlichen Hand staatlich gefördert werden sollten? Schildern Sie Ihre Gedanken zu dieser Frage.', tips: ['Sozialer Nutzen von Sportvereinen', 'Staatliche Förderung begründen', 'Beispiele nennen'] },
    topic_b: { title: 'Ratenzahlung vs. Sparen', prompt: 'Für Konsumgüter gibt es heute fast überall bequeme Ratenzahlung. Ist Sparen für besondere Ankäufe wie zum Beispiel Möbel oder ein Auto noch zeitgemäß? Legen Sie Ihre Ansichten und Beobachtungen dar.', tips: ['Vor- und Nachteile beider Methoden', 'Konsumkultur beschreiben', 'Persönliche Empfehlung'] }
  },
  {
    id: 'B9', variante: 'B — Variante 9',
    topic_a: { title: 'Erziehung von Jungen und Mädchen', prompt: 'Sollten Jungen und Mädchen gleich erzogen werden? Legen Sie Ihre Meinung zu diesem Thema dar. Berichten Sie auch von eigenen Erfahrungen.', tips: ['Gleichberechtigung in der Erziehung', 'Biologische vs. soziale Unterschiede', 'Eigene Kindheitserfahrungen'] },
    topic_b: { title: 'Mode und Persönlichkeit', prompt: 'Oft hört man, dass die Mode dazu beitrage, die eigene Persönlichkeit zu betonen. Stimmen Sie der Aussage zu? Welchen Stellenwert hat Mode in Ihrem Leben?', tips: ['Mode als Selbstausdruck', 'Konsumkritik', 'Persönliche Modephilosophie'] }
  },
  {
    id: 'B10', variante: 'B — Variante 10',
    topic_a: { title: 'Politiker und Statussymbole', prompt: 'Sollten Politikerinnen und Politiker auf Statussymbole wie teure Rolex oder (Schmuck), teures Auto oder teure Kleidung verzichten? Begründen Sie Ihre Haltung.', tips: ['Vorbildfunktion von Politikern', 'Öffentliches Vertrauen', 'Unterschied zwischen Privatem und Öffentlichem'] },
    topic_b: { title: 'Motivation und Erfolg', prompt: 'Die richtige Motivation gilt manchen als entscheidender Erfolgsfaktor. Was sind für Sie persönlich starke Motivationsfaktoren? Schildern Sie Ihre Überlegungen zu dieser Frage.', tips: ['Intrinsische vs. extrinsische Motivation', 'Persönliche Antriebe beschreiben', 'Beispiele aus dem eigenen Leben'] }
  },
  {
    id: 'B11', variante: 'B — Variante 11',
    topic_a: { title: 'Antiautoritäre Erziehung', prompt: 'Manche Eltern möchten ihre Kinder antiautoritär erziehen. Was halten Sie davon, Kinder ohne Zwänge aufwachsen zu lassen? Legen Sie Ihre Haltung zu dieser Frage dar.', tips: ['Grenzen und Freiheit in der Erziehung', 'Vor- und Nachteile', 'Persönliche Erziehungsphilosophie'] },
    topic_b: { title: 'Offene Bibliotheken', prompt: 'Zeitschriften und Bücher kann man über das Internet ausleihen. Denkst du, brauchen wir noch offene Bibliotheken? Lege deine Meinung dazu dar.', tips: ['Wert physischer Bibliotheken', 'Digitale Alternativen', 'Sozialer Aspekt der Bibliothek'] }
  },
  {
    id: 'B12', variante: 'B — Variante 12',
    topic_a: { title: 'Prominente beurteilen', prompt: 'Sollte man Prominente nur an ihrer beruflichen Leistung oder auch an ihren Einstellungen bzw. ihrem Verhalten messen? Begründen Sie Ihre Ansicht. Sie können auch bekannte Beispiele anführen.', tips: ['Vorbildfunktion', 'Privatleben vs. öffentliche Person', 'Bekannte Beispiele'] },
    topic_b: { title: 'Nachbarschaft in Städten', prompt: 'Wird in unseren Städten der Kontakt zu den Nachbarn vernachlässigt? Erläutern Sie Ihre Ansichten zum Thema Nachbarschaft. Vergleichen Sie auch mit einem Land Ihrer Wahl.', tips: ['Urbanisierung und Anonymität', 'Gemeinschaftsgefühl', 'Kultureller Vergleich'] }
  },
  {
    id: 'B13', variante: 'B — Variante 13',
    topic_a: { title: 'Privatautos in der Stadt', prompt: 'Viele Städte leiden unter dem ständig zunehmenden Straßenverkehr. Manche Bürger fordern sogar ein vollständiges Verbot von Privatautos in Städten. Erläutern Sie Ihre Haltung zu dieser Position.', tips: ['Verkehrsprobleme beschreiben', 'Alternativen zum Auto', 'Persönliche Freiheit vs. Umweltschutz'] },
    topic_b: { title: 'Prägende Person im Leben', prompt: 'Welche Person aus Ihrem persönlichen Umfeld (Familie, Freunde, Lehrer etc.) hat Ihr Leben am meisten geprägt? Was haben Sie von dieser Person gelernt und welchen Einfluss hat das auf Ihr Leben heute? Erzählen Sie.', tips: ['Konkrete Person und Erfahrungen beschreiben', 'Gelerntes auf das heutige Leben anwenden', 'Dankbarkeit ausdrücken'] }
  },
  {
    id: 'B14', variante: 'B — Variante 14',
    topic_a: { title: 'Umweltschutz und Reisen', prompt: 'Sollten wir aus Umweltschutzgründen auf Reisen verzichten? Legen Sie Ihre Ansichten zu dieser Frage dar.', tips: ['CO₂-Fußabdruck des Reisens', 'Alternativen zum Fernreisen', 'Persönliche Einstellung zum Reisen'] },
    topic_b: { title: 'Stolz oder Überheblichkeit?', prompt: 'Beim Begriff „Stolz" gehen die Meinungen auseinander: Selbstbewusstsein oder Überheblichkeit? Wie legen Sie persönlich diesen Begriff aus? Nennen Sie Beispiele und vergleichen Sie mit einem Land Ihrer Wahl.', tips: ['Unterschied zwischen Stolz und Arroganz', 'Kulturelle Unterschiede', 'Eigene Definition'] }
  },
  {
    id: 'B15', variante: 'B — Variante 15',
    topic_a: { title: 'Nachbarschaft (Variante)', prompt: 'Wird in unseren Städten der Kontakt zu den Nachbarn vernachlässigt? Erläutern Sie Ihre Ansichten zum Thema Nachbarschaft. Vergleichen Sie auch mit einem Land Ihrer Wahl.', tips: ['Urbanisierung und Anonymität', 'Gemeinschaftsgefühl', 'Kultureller Vergleich'] },
    topic_b: { title: 'Prominente (Variante)', prompt: 'Sollte man Prominente nur an ihrer beruflichen Leistung oder auch an ihren Einstellungen bzw. ihrem Verhalten messen? Begründen Sie Ihre Ansicht. Sie können auch bekannte Beispiele anführen.', tips: ['Vorbildfunktion', 'Privatleben vs. öffentliche Person', 'Bekannte Beispiele'] }
  },

  // ══════════════════════════════════════════════════
  // Liste C — 14 Variante
  // ══════════════════════════════════════════════════
  {
    id: 'C1', variante: 'C — Variante 1',
    topic_a: { title: 'Veränderungen im Leben', prompt: 'Veränderungen rufen bei manchen Menschen Verunsicherung hervor, während andere sie als Ansporn ansehen. Wie empfinden Sie Veränderungen? Legen Sie Ihre Überlegungen dar. Berichten Sie auch von Ihren Erfahrungen.', tips: ['Persönliche Einstellung zu Veränderungen', 'Positive und negative Aspekte', 'Konkrete Erfahrungen'] },
    topic_b: { title: 'Streikkultur', prompt: 'In verschiedenen Ländern gibt es unterschiedliche Streikkulturen. Wie ist Ihre Haltung zum Thema Streiken? Berichten Sie von eigenen Erfahrungen. Denken Sie auch an historische Entwicklungen.', tips: ['Bedeutung des Streikrechts', 'Historische Beispiele', 'Kulturelle Unterschiede'] }
  },
  {
    id: 'C2', variante: 'C — Variante 2',
    topic_a: { title: 'Gefühle in der Öffentlichkeit', prompt: 'Schlechte Laune hat jeder einmal. Doch in Gesellschaft reißen sich die meisten Menschen zusammen. Sollte man seine Gemütsverfassung auch in der Öffentlichkeit zeigen? Begründen Sie Ihre Haltung zu dieser Frage.', tips: ['Authentizität vs. soziale Normen', 'Kulturelle Unterschiede', 'Persönliche Erfahrungen'] },
    topic_b: { title: 'Fitness-Training', prompt: 'Fitness-Training: eitle Selbstoptimierung oder berechtigter Wunsch nach guter körperlicher Verfassung? Erläutern Sie Ihre Meinung und berichten Sie von Ihren Erfahrungen und Beobachtungen.', tips: ['Gesundheitliche Aspekte', 'Gesellschaftlicher Druck', 'Persönliche Erfahrungen'] }
  },
  {
    id: 'C3', variante: 'C — Variante 3',
    topic_a: { title: 'Wichtige historische Ereignisse', prompt: 'Welche historischen Ereignisse sind Ihrer Meinung nach besonders wichtig? Begründen Sie Ihre Meinung.', tips: ['Kriterien für Wichtigkeit', 'Konkrete Ereignisse nennen', 'Einfluss auf die Gegenwart'] },
    topic_b: { title: 'Sprache gut lernen', prompt: 'Wie kann man eine Sprache gut lernen? Geben Sie Tipps und begründen Sie aus Ihrer Erfahrung.', tips: ['Verschiedene Lernmethoden', 'Persönliche Erfolgsstrategien', 'Häufige Fehler vermeiden'] }
  },
  {
    id: 'C4', variante: 'C — Variante 4',
    topic_a: { title: 'Junge Erwachsene und Elternhaus', prompt: 'Junge Erwachsene ziehen immer später von zu Hause aus. Sollten sie sich an den Kosten für die Unterkunft und Verpflegung beteiligen und ihren Eltern Geld dafür zahlen? Erläutern Sie Ihre Haltung und berichten Sie von eigenen Erfahrungen.', tips: ['Selbstständigkeit und Verantwortung', 'Finanzielle Realität junger Erwachsener', 'Kulturelle Unterschiede'] },
    topic_b: { title: 'Beurteilung durch Sympathie', prompt: 'Denken Sie, dass die Beurteilung in Schule und Beruf von persönlicher Sympathie beeinflusst wird? Schildern Sie Ihre Meinung.', tips: ['Objektivität vs. Subjektivität', 'Persönliche Erfahrungen', 'Auswirkungen auf Gerechtigkeit'] }
  },
  {
    id: 'C5', variante: 'C — Variante 5',
    topic_a: { title: 'Ehe und gesellschaftliche Rolle', prompt: 'Welche gesellschaftliche Rolle spielt die Ehe in Ihrem Herkunftsland, und wie hat sich die Bedeutung der Ehe im Laufe der Zeit verändert? Oder: Welche gesellschaftliche Rolle spielt die Ehe im Land Ihrer Wahl?', tips: ['Traditionelle vs. moderne Ehe', 'Kulturelle Unterschiede', 'Persönliche Meinung'] },
    topic_b: { title: 'Wichtige historische Ereignisse (Variante)', prompt: 'Welche historischen Ereignisse sind Ihrer Meinung nach besonders wichtig? Begründen Sie Ihre Meinung.', tips: ['Kriterien für Wichtigkeit', 'Konkrete Ereignisse', 'Einfluss auf die Gegenwart'] }
  },
  {
    id: 'C6', variante: 'C — Variante 6',
    topic_a: { title: 'Sport im Bildungsangebot', prompt: 'Sollte Sport ein fester Bestandteil des Bildungsangebotes sein? Was kann man im Sportunterricht lernen? Erläutern Sie Ihren Standpunkt.', tips: ['Pädagogischer Wert des Sports', 'Teamarbeit und soziale Kompetenzen', 'Gesundheitliche Aspekte'] },
    topic_b: { title: 'Rollenbilder in der Schule', prompt: 'Sind Sie der Meinung, dass in der Schule immer noch traditionelle Rollenbilder von Mann und Frau vermittelt werden? Berichten Sie von Ihren eigenen Erfahrungen mit diesem Thema.', tips: ['Eigene Schulerfahrungen beschreiben', 'Wandel in der Bildung', 'Gesellschaftliche Auswirkungen'] }
  },
  {
    id: 'C7', variante: 'C — Variante 7',
    topic_a: { title: 'Überwachungskameras', prompt: 'In vielen Städten sind an öffentlichen Plätzen Überwachungskameras installiert. Denken Sie, dass eine solche Überwachung notwendig ist? Begründen Sie Ihren Standpunkt und bringen Sie Beispiele.', tips: ['Sicherheit vs. Privatsphäre', 'Wirksamkeit der Überwachung', 'Rechtliche Aspekte'] },
    topic_b: { title: 'Fremdsprache im Land lernen', prompt: 'Sind Sie der Meinung, dass man eine Fremdsprache nur in dem jeweiligen Land richtig gut lernen kann? Schildern Sie Ihre Erfahrungen und Beobachtungen zu dieser Frage.', tips: ['Immersionsmethode beschreiben', 'Alternative Lernmethoden', 'Eigene Sprachlernerfahrungen'] }
  },
  {
    id: 'C8', variante: 'C — Variante 8',
    topic_a: { title: 'Kreditkarten', prompt: 'Kreditkarten sind als bargeldloses Zahlungsmittel immer beliebter geworden. Befürworten Sie die allgemeine Verwendung von Kreditkarten? Sehen Sie darin auch Gefahren? Legen Sie Argumente dar. Oder: Was sind die Vorteile von bargeldlosen Zahlungsmitteln, worin die Gefahren?', tips: ['Vorteile des Kreditkartensystems', 'Risiken und Gefahren', 'Persönliche Meinung'] },
    topic_b: { title: 'Kommerzialisierung von Festen', prompt: 'Traditionelle und religiöse Feste werden zunehmend kommerzialisiert. Sehen Sie darin einen Grund, solche Feste gar nicht mehr zu feiern? Erläutern Sie Ihre Ansicht. Führen Sie Beispiele aus Ihrem persönlichen Umfeld an.', tips: ['Bedeutung von Traditionen', 'Kommerzielle Einflüsse', 'Persönliche Beispiele'] }
  },
  {
    id: 'C9', variante: 'C — Variante 9',
    topic_a: { title: 'Junge Erwachsene und Elternhaus (Variante)', prompt: 'Junge Erwachsene ziehen immer später von zu Hause aus. Sollten sie sich an den Kosten für die Unterkunft und Verpflegung beteiligen? Erläutern Sie Ihre Haltung.', tips: ['Selbstständigkeit', 'Finanzielle Aspekte', 'Kulturelle Unterschiede'] },
    topic_b: { title: 'Beurteilung durch Sympathie (Variante)', prompt: 'Denken Sie, dass die Beurteilung in Schule und Beruf von persönlicher Sympathie beeinflusst wird? Schildern Sie Ihre Erfahrungen und Überlegungen zu dieser Frage.', tips: ['Objektivität vs. Subjektivität', 'Persönliche Erfahrungen', 'Auswirkungen'] }
  },
  {
    id: 'C10', variante: 'C — Variante 10',
    topic_a: { title: 'Gerechtigkeit im Laufe der Geschichte', prompt: 'Denken Sie, dass unsere Gesellschaften im Laufe der Geschichte gerechter geworden sind? Erläutern Sie Ihre Meinung und führen Sie konkrete Beispiele an.', tips: ['Historische Entwicklungen', 'Fortschritte und Rückschritte', 'Konkrete Beispiele'] },
    topic_b: { title: 'Benimmregeln', prompt: 'In den Mantel helfen, Frauen den Vortritt lassen, aufstehen wenn eine Frau den Raum betritt – sind solche Benimmregeln noch zeitgemäß? Schildern Sie Ihre Ansichten zu diesem Thema. Sie können auch Vergleiche mit einem Land Ihrer Wahl anstellen.', tips: ['Tradition vs. Modernität', 'Geschlechterrollen', 'Kultureller Vergleich'] }
  },
  {
    id: 'C11', variante: 'C — Variante 11',
    topic_a: { title: 'Fremdsprachen für Kinder', prompt: 'Fremdsprachen spielen eine große Rolle und sollten laut Studien in jungen Jahren erlernt werden. Wie stehen Sie dazu, dass Kinder im Vorschulalter Fremdsprachen lernen?', tips: ['Vorteile frühen Sprachenlernens', 'Mögliche Nachteile', 'Persönliche Erfahrungen'] },
    topic_b: { title: 'Zeit und Zeitdruck', prompt: 'Häufig klagen Menschen über Zeitdruck. Wie wichtig ist Zeit in Ihrem eigenen Leben? Erläutern Sie Ihre Haltung zu diesem Thema. Sie können auch Vergleiche mit einem Land Ihrer Wahl anstellen.', tips: ['Persönlicher Umgang mit Zeit', 'Gesellschaftlicher Zeitdruck', 'Kultureller Vergleich'] }
  },
  {
    id: 'C12', variante: 'C — Variante 12',
    topic_a: { title: 'Radio als Medium', prompt: 'Umfragen zufolge hören 90% aller Befragten in Deutschland regelmäßig Radio. Welche Bedeutung hat dieses Medium für Sie persönlich? Vergleichen Sie auch mit anderen Medien.', tips: ['Bedeutung des Radios', 'Vergleich mit Internet, TV, Podcasts', 'Persönliche Medienpräferenz'] },
    topic_b: { title: 'Schwierigkeiten als Chancen', prompt: 'Denken Sie, dass Schwierigkeiten vor allem Chancen sind? Begründen Sie Ihren Standpunkt.', tips: ['Positive Einstellung zu Herausforderungen', 'Persönliche Erfahrungen', 'Grenzen dieser Sichtweise'] }
  },
  {
    id: 'C13', variante: 'C — Variante 13',
    topic_a: { title: 'Märchen für Kinder', prompt: 'Brauchen die Kinder Märchen zu hören? Glauben Sie, dass Kinder phantasievolle Geschichten brauchen? Erzählen Sie von Ihren Erfahrungen.', tips: ['Pädagogische Bedeutung von Märchen', 'Entwicklung der Fantasie', 'Persönliche Kindheitserinnerungen'] },
    topic_b: { title: 'Platzhalter C13-B', prompt: 'Radio: Umfragen zufolge hören 90% aller Befragten in Deutschland regelmäßig Radio. Welche Bedeutung hat dieses Medium für Sie persönlich? Vergleichen Sie auch mit anderen Medien.', tips: ['Bedeutung des Radios', 'Vergleich mit anderen Medien', 'Persönliche Präferenz'] }
  },
  {
    id: 'C14', variante: 'C — Variante 14',
    topic_a: { title: 'Radio (Variante)', prompt: 'Umfragen zufolge hören 90% aller Befragten in Deutschland regelmäßig Radio. Welche Bedeutung hat dieses Medium für Sie persönlich? Vergleichen Sie auch mit anderen Medien.', tips: ['Bedeutung des Radios beschreiben', 'Vergleich mit Internet, TV, Podcasts', 'Persönliche Medienpräferenz'] },
    topic_b: { title: 'Schwierigkeiten als Chancen (Variante)', prompt: 'Denken Sie, dass Schwierigkeiten vor allem Chancen sind? Begründen Sie Ihren Standpunkt.', tips: ['Positive Einstellung', 'Persönliche Erfahrungen', 'Grenzen dieser Sichtweise'] }
  },
];

export const SEED_ZITATE: Zitat[] = [
  { id: 'Z1', text: 'Wege entstehen, indem man sie geht.', author: 'Franz Kafka', discussion_angle: 'Ich stimme diesem Zitat vollkommen zu — Erfolg kommt nicht durch Warten, sondern durch mutiges Handeln, auch wenn der Weg noch nicht klar ist.' },
  { id: 'Z2', text: 'Lügen ist immer besser als Wahrheit.', author: 'Deutsches Sprichwort (provokativ)', discussion_angle: 'Ich bin dagegen — Lügen zerstört Vertrauen langfristig, auch wenn es kurzfristig bequemer erscheint.' },
  { id: 'Z3', text: 'Über Geschmack muss man nicht streiten.', author: 'Deutsches Sprichwort', discussion_angle: 'Ich stimme teilweise zu — persönliche Vorlieben sind subjektiv, aber bei ethischen Fragen lohnt sich die Diskussion durchaus.' },
  { id: 'Z4', text: 'Höflichkeit ist eine Kunst, die zeigen wir.', author: 'Allgemeine Weisheit', discussion_angle: 'Ich sehe Höflichkeit als erlernbare Kompetenz und als wichtigen Schlüssel für das Miteinander.' },
  { id: 'Z5', text: 'Glück ist kostenlos aber unbezahlbar.', author: 'Deutsches Sprichwort', discussion_angle: 'Glück kann man nicht kaufen, aber durch Beziehungen und innere Zufriedenheit kultivieren.' },
  { id: 'Z6', text: 'Freunde sind auch Familie, die man aussuchen kann.', author: 'Moderne Weisheit', discussion_angle: 'Echte Freundschaft hat eine Qualität, die manchmal sogar Blutsverwandtschaft übertrifft.' },
  { id: 'Z7', text: 'Jedes Kind ist gewissermaßen ein Genie und jedes Genie gewissermaßen ein Kind.', author: 'Arthur Schopenhauer', discussion_angle: 'Kinder und Genies teilen Neugier, Kreativität und die Fähigkeit, die Welt unvoreingenommen zu betrachten.' },
  { id: 'Z8', text: 'Träume nicht dein Leben, lebe deinen Traum.', author: 'Allgemeine Motivation', discussion_angle: 'Träume brauchen Taten. Nur wer aktiv wird, kann seine Visionen verwirklichen.' },
  { id: 'Z9', text: 'Das Handy bedeutet Verlust an Freiheit.', author: 'Moderne These', discussion_angle: 'Das Handy kann Freiheit erweitern oder einschränken, je nachdem wie bewusst man es nutzt.' },
  { id: 'Z10', text: 'Stärker bedeutet auch zu wissen, dass man nicht immer stark sein kann.', author: 'Moderne Weisheit', discussion_angle: 'Wahre Stärke schließt die Fähigkeit ein, Schwäche zu akzeptieren und um Hilfe zu bitten.' },
  { id: 'Z11', text: 'Statt die Gleichheit zu holen, sollte man zum Respekt vor der Vielfalt raten.', author: 'Moderne Weisheit', discussion_angle: 'Respekt vor Vielfalt ist reifer als erzwungene Gleichheit, die individuelle Unterschiede ignoriert.' },
  { id: 'Z12', text: 'Erfahrungen sind etwas, was man bekommt, nachdem man sie gebraucht hätte.', author: 'Deutsches Sprichwort', discussion_angle: 'Wir lernen oft erst im Nachhinein — deshalb sollten wir auch aus den Erfahrungen anderer lernen.' },
  { id: 'Z13', text: 'Freude ist die einfachste Form der Dankbarkeit.', author: 'Karl Barth', discussion_angle: 'Wenn wir uns wirklich freuen, drücken wir damit am authentischsten unsere Dankbarkeit aus.' },
  { id: 'Z14', text: 'Hat die Mehrheit immer Recht?', author: 'Demokratische Diskussionsthese', discussion_angle: 'Ich bin skeptisch — Mehrheitsmeinungen können falsch sein. Minderheiten können wichtige Wahrheiten vertreten.' },
  { id: 'Z15', text: 'Die Zeit ist wertvoller als Geld.', author: 'Allgemeine Weisheit', discussion_angle: 'Zeit ist nicht rückholbar, Geld schon. Wer Zeit klug investiert, gewinnt mehr als durch materielle Güter.' },
  { id: 'Z16', text: 'Ein nebliger Morgen ist noch kein wolkiger Tag.', author: 'Deutsches Sprichwort', discussion_angle: 'Ein optimistisches Sprichwort — schwierige Anfänge bedeuten nicht zwangsläufig ein schlechtes Ergebnis.' },
  { id: 'Z17', text: 'Genug ist besser als zu viel.', author: 'Deutsches Sprichwort', discussion_angle: 'Zufriedenheit mit dem Ausreichenden ist Weisheit; Gier führt oft zu Unglück.' },
  { id: 'Z18', text: 'Kein Mensch ist so reich, dass er nicht seinen Nachbarn bräuchte.', author: 'Deutsches Sprichwort', discussion_angle: 'Wir alle sind voneinander abhängig, unabhängig von Reichtum.' },
  { id: 'Z19', text: 'Papier ist geduldig.', author: 'Deutsches Sprichwort', discussion_angle: 'Man kann alles aufschreiben, aber das macht es noch nicht wahr oder verbindlich.' },
  { id: 'Z20', text: 'Bildung ist eine Waffe, die die Welt verändert.', author: 'Nelson Mandela (adaptiert)', discussion_angle: 'Bildung ist das mächtigste Werkzeug gegen Armut, Ungerechtigkeit und Unwissenheit.' },
  { id: 'Z21', text: 'Wissen ist Macht.', author: 'Francis Bacon', discussion_angle: 'Wer Wissen hat, kann andere beeinflussen und die Gesellschaft gestalten.' },
  { id: 'Z22', text: 'Jeder will länger leben, aber nicht älter werden.', author: 'Moderne Weisheit', discussion_angle: 'Wir fürchten das Altern, wollen aber seine Früchte in Form von langem Leben genießen.' },
  { id: 'Z23', text: 'Das Geld macht die Menschen attraktiv.', author: 'Gesellschaftsthese', discussion_angle: 'Ich widerspreche — Charakter, Intelligenz und Herzlichkeit machen Menschen attraktiver als Geld.' },
  { id: 'Z24', text: 'Geld verschafft eine Unabhängigkeit, aber zu wissen, dass man auch ohne leben kann, das verschafft eine Freiheit.', author: 'Moderne Weisheit', discussion_angle: 'Wahre Freiheit liegt nicht im Besitz, sondern in der inneren Loslösung vom materiellen Denken.' },
  { id: 'Z25', text: 'Wie Nichtstun die Kreativität fördert.', author: 'Moderne These', discussion_angle: 'Pausen und bewusstes Nichtstun sind oft der Nährboden für kreative Ideen und neue Perspektiven.' },
  { id: 'Z26', text: 'Soziale Medien verbessern die Kommunikation.', author: 'Moderne These', discussion_angle: 'Ich sehe das differenziert — soziale Medien erleichtern Kontakte, können aber zu Oberflächlichkeit führen.' },
  { id: 'Z27', text: 'Soziale Netzwerke machen einsame Menschen einsamer.', author: 'Psychologische These', discussion_angle: 'Wer bereits isoliert ist, findet online oft keinen echten Ersatz für menschliche Nähe.' },
  { id: 'Z28', text: 'Beziehungen sind wichtiger als Können.', author: 'Deutsches Sprichwort', discussion_angle: 'Netzwerke öffnen Türen, aber ohne Kompetenz bleibt man langfristig nicht erfolgreich.' },
  { id: 'Z29', text: 'Man kann das Leben ändern, wenn man seine Denkweise ändert.', author: 'Moderne Weisheit', discussion_angle: 'Die innere Haltung bestimmt, wie wir Herausforderungen begegnen und Chancen nutzen.' },
  { id: 'Z30', text: 'Der Klügere gibt nach — eine traurige Wahrheit, sie begründet die Weltherrschaft der Dummheit.', author: 'Marie von Ebner-Eschenbach', discussion_angle: 'Nachgeben ist oft klug, aber wir dürfen Ungerechtigkeit nicht kampflos das Feld überlassen.' },
  { id: 'Z31', text: 'Wenn zwei Personen sich streiten, freut sich der Dritte.', author: 'Deutsches Sprichwort', discussion_angle: 'Konflikte schaffen oft Vorteile für Dritte — eine Warnung vor sinnlosem Streit.' },
  { id: 'Z32', text: 'Es gibt eine Menge Menschen aber noch viel mehr Gesichter.', author: 'Deutsches Sprichwort', discussion_angle: 'Ein kritischer Blick auf menschliche Doppelzüngigkeit — wir sollten achtsam, aber nicht misstrauisch sein.' },
  { id: 'Z33', text: 'Im Internet ist alles immer aktueller als in Büchern.', author: 'Moderne These', discussion_angle: 'Stimmt oft, aber nicht immer — Bücher bieten Tiefe und Zuverlässigkeit, die Online-Infos oft fehlt.' },
  { id: 'Z34', text: 'Wir brauchen Ernährungserziehung.', author: 'Moderne These', discussion_angle: 'Angesichts steigender Zivilisationskrankheiten ist Ernährungsbildung in Schulen dringend notwendig.' },
  { id: 'Z35', text: 'Schönheit ist ein Schlüssel zum Erfolg.', author: 'Gesellschaftsthese', discussion_angle: 'Äußere Schönheit kann Türen öffnen, aber ohne innere Qualitäten bleibt der Erfolg oberflächlich.' },
  { id: 'Z36', text: 'Das Leben ist komisch ohne Freude, aber schön mit Ernst.', author: 'Deutsches Sprichwort', discussion_angle: 'Freude macht das Leben lebenswert, aber Ernsthaftigkeit gibt ihm Tiefe und Bedeutung.' },
  { id: 'Z37', text: 'Individuelle zählt oder Gruppe.', author: 'Gesellschaftliche Diskussionsthese', discussion_angle: 'Individuum und Gruppe ergänzen einander — keines sollte das andere vollständig unterdrücken.' },
  { id: 'Z38', text: 'Spielen sind nur für Kinder.', author: 'Gesellschaftsthese', discussion_angle: 'Ich widerspreche — Spiel ist für alle Altersgruppen wichtig für Kreativität und Entspannung.' },
  { id: 'Z39', text: 'Man kann das Leben erreichen, was man vornimmt.', author: 'Motivationale These', discussion_angle: 'Wille und Einsatz sind entscheidend, aber äußere Umstände spielen auch eine Rolle.' },
  { id: 'Z40', text: 'Freude ist die einfachste Form der Dankbarkeit.', author: 'Karl Barth', discussion_angle: 'Echte Freude ist die aufrichtigste Antwort auf eine Wohltat — natürlicher als jede formelle Dankesbekundung.' },
];
