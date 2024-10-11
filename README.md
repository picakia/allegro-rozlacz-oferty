# Allegro rozłącz oferty

Projekt mający na celu próbę przywrócenia rozłączania ofert allegro. 

Aktualnie dostępny jest userscript `AllegroRozlaczV2.js` do załadowania w menadżerze skryptów, np. Tampermonkey ~oraz wstępna wersja rozszerzenia do przeglądarki używając manifest V2~ (nieaktualna)

## Instalacja w menadżerze skryptów

1. Pobieramy menedżer skryptów
2. Włączamy tryb dewelopera w przeglądarce zgodnie z instrukcją menedżera skryptów ([instrukcja dla Tampermonkey](https://www.tampermonkey.net/faq.php?locale=en#Q209))
3. Klikamy "Stwórz nowy skrypt" w menu rozszerzenia
4. Wklejamy kod z `AllegroRozlaczV2.js` i zapisujemy (Ctrl+S)
5. Wchodzimy na allegro i na stronie wyszukiwania powinien pojawić się guzik rozłaczania ofert.
6. (opcjonalnie) W opcjach skrytpu można ustawić adres do aktualizacji: `https://raw.githubusercontent.com/picakia/allegro-rozlacz-oferty/refs/heads/master/AllegroRozlaczV2.js` - to ułatwi wczytywanie nowych wersji

Docelowo skrypt będzie opublikowany na GreasyFork, na razie jest to bardzo wczesna wersja i przed publikacją chcę mieć stabliną wersję.

## Zasada działania

Po zmianach od 1 października publiczne API allegro nie zwraca wszystkich ofert, a jedynie listę produktową. Według Allegro aby teraz znaleźć produkt, którego się szuka należy kliknąć za każdym razem w guzik "Porównaj X ofert". 

Ten skrypt robi dokładnie to o co prosi Allegro - Klika **każdy** guzik "Porównaj X ofert" na **każdej** stronie wyników wyszukiwania po czym prezentuje oferty na jednej stronie.

Niestety może się zdarzyć, że skrypt spowoduje błąd 429 lub 403 oznaczający przekroczenie ilości zapytań w czasie (widoczny w konsoli deweloperskiej). Rozwiązaniem jest najczęściej odświeżenie strony i rozwiązanie captcha/puzelka.

W kodzie nie ma aktualnie żadnych timeoutów, ale samo API odpowiada dość wolno i blokada jest raczej rzadka.

## Jak używać

Po instalacji i odświeżeniu allegro.pl powinien pojawić się guzik 'Rozłącz te same oferty' po prawej stronie paska z sortowaniem. 

**Przed kliknięciem tego guzika postaraj się jak najbardziej zawęzić wyszukiwanie używając filtrów tak aby nie przekraczać 3-5 stron. Im więcej stron tym dłużej będzie się ładować i zwiększy szansę na bycie tymczasowo zablokowanym**

W moich testach skrypt potrafił odczytać maksymalnie około 2000 ofert. Przy większej ilości wystarczyło zwykle rozwiązać captcha.

Po kliknięciu guzika powinien pojawić się pasek pokazujący postęp (aktualnie tylko w ciemnym motywie). Gdyby szedł za szybko lub długo wisiał w jednym miejscu to sprawdź konsolę przeglądarki. 
Prawdopodobnie to blokada 403/429 - odświenie strony powinno pomóc.

Jeśli wszystko pójdzie dobrze to rozłączone oferty powinny się pojawić na stronie posortowane od najniższej ceny.

Dodatkowo działa też sortowanie po najwyższej cenie, w tym celu **przed kliknięciem guzika** wybierz sortowanie od najwyższej ceny. **Inne sortowania nie działają na razie**

## Co dalej - od najpilniejszych

- Obsługa błędów i informacja graficzna dla Usera
- Dodanie ofert z allegrolokalnie.pl
- Funkcjonalny guzik "Dodaj do koszyka"
- Funkcjonalny guzik "Dodaj do ulubionych"
- Wrzucenie skryptu do GreasyFork
- Porządek w repozytorium
- Dodanie obsługi większej ilości sortowań
- Działające powiększanie i przeglądanie zdjęć aukcji po najechaniu myszką
- Działające filtry (tylko zawężanie, w drugą stronę nie jest wykonalne)
- Dodanie IFrame lub okna gdzie w razie zablokowania będzie można rozwiązać captcha/puzelek po czym kontynuowanie pobieranie ofert
- Jasny motyw
- Finalna wersja rozszerzenia i wrzucenie do web storów - wymaga dużej ilości pracy 

## Wkład w rozwój projektu

* Znalazłeś/aś błąd? [Zgłoś issue](https://github.com/picakia/allegro-rozlacz-oferty/issues/new/choose)
* Masz pomysł na nową funkcję/poprawkę ale nie czujesz się dobrze w kodowaniu? [Zaproponuj zmianę](https://github.com/picakia/allegro-rozlacz-oferty/issues)
* Masz pomysł na poprawkę w kodzie? [Zaproponuj Pull-Request](https://github.com/picakia/allegro-rozlacz-oferty/pulls)
