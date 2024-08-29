# Allegro rozłącz oferty

Projekt mający na celu próbę przywrócenia rozłączania ofert allegro. Aktualnie dostępny jest userscript `AllegroRozlacz.js` do załadowania w menadżerze skryptów, np. Tampermonkey i wstępna wersja rozszerzenia do przeglądarki używając manifest V2

## Zasada działania

Z uwagi na to, że publiczne API allegro nie zwraca wszystkich produktów trzeba przejść przez wszystkie wyniki i po kolei kliknąć każdy guzik "Porównaj X ofert" po czym połączyć to wszystko w jedną całość.

Może się zdarzyć, że skrypt spowoduje błąd 429 (widoczny w konsoli deweloperskiej), wtedy trzeba odświeżyć stronę i rozwiązać puzelka. Docelowo można zrobić jakiś iframe lub okno gdzie puzelek się pojawi i będzie potem automatycznie kontynuować pobieranie ofert.

W kodzie są dodane timeouty na requesty, aby spróbować ograniczyć szansę na tymczasowe zablokowanie 429, ale szczerze nie opłaca się to czasowo, szybciej rozwiązać puzelka raz na jakiś czas.

## Jak używać

Po instalacji i odświeżeniu Allegro.pl powinien pojawić się guzik 'Rozłącz te same oferty' po prawej stronie paska z filtrami. 

**Przed kliknięciem tego guzika postaraj się jak najbardziej zawęzić wyszukiwanie używając filtrów tak aby nie przekraczać 3 stron. Im więcej stron tym dłużej będzie się ładować i zwiększy szansę na bycie zablokowanym**

Jak już klikniesz to powinien pojawić się pasek pokazujący postęp, jak będzie szedł za szybko to sprawdź konsolę, pewnie to blokada 429.

Poza tym oferty powinny się ładnie pojawić na stronie posortowane od najniższej ceny.

Ewentualnie działa też sortowanie po najwyższej cenie, w tym celu **przed kliknięciem guzika** wybierz sortowanie od najwyższej ceny. **Inne sortowania nie działąją na razie**

## Co dalej?

No ogólnie to fajnie by było nie scrapować całych htmli tylko przebić się po opbox API, ale nie wiem o ile to się uda. Dobrze by było skończyć też to rozszerzenie i wrzucić do web storów, ale to jeszcze dużo opcji trzeba by dodać, a że czasu nie mam za dużo to nie wiem jak mi pójdzie. Jak ktoś jest chętny pomóc to zapraszam do Pull requestów, może wtedy pójdzie szybciej i lepiej.