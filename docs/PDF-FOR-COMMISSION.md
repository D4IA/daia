# DAIA - Decentralize AI Agents

## Linki
- [Demo](https://daiademo.teawithsand.com/) - Demonstracja jednego z zastosowań biblioteki DAIA za pośrednictwem symulacji parkingu obsługiwanego przez agentów AI.
- [Platforma Dowodowa](https://daiaui.teawithsand.com/) - Landing page oraz strona, na której można sprawdzić transakcje na blockchain - umowy zawarte między agentami.
- [Dokumentacja](https://daiadocs.teawithsand.com/) - Dokumentacja.

## Dane Logowania
- Login: `Jeffrey`
- Hasło: `SerwerJestNaMojejTajnejWyspieUwU`

## Ograniczenia
1. Demo zostało zaprojektowane z myślą o korzystaniu z niego na desktopie (nie telefonie/tablecie).
2. Dostęp do strony jest og

## Samodzielne Testowanie Demo
1. Wejdź na [stronę z symulacją demo](https://daiademo.teawithsand.com/) i podaj dane logowania.
2. Zapoznaj się z komunikatem.
3. Utwórz agenta samochodu przez opcję "Configure new car" podążając zgodnie z instrukcjami. W najprostrzej wersji wybierz predefiniowany klucz.
    - Tymczasowo zapisz w notatce klucz prywatny i adres publiczny portfela w infrastrukturze BSV widoczne na ekranie.
4. Jeśli chcesz możesz zmodyfikować ustawienia agenta bramki parkingowej przez opcję "Gate settings".
5. Powinieneś posiadać 1 pojazd. Możesz wybrać opcję "Enter parking" i wybrać utworzony pojazd przez opcję "select".
6. Pojawi się ekran z widoczną konwersacją agentów: bramki parkingowej oraz samochodu.
    - Agenci komunikują się tekstem naturalnym oraz za pośrednictwem protokołu DAIA - specjalnego formatu wiadomości.
    - Strony nawiązują kontakt, rozpoczyna się negocjacja ceny (w demo waluta to satoshi - drobne składowe kryptowaluty BSV - odpowiednik BSV odpowiada złotym polskim, a satoshi groszom).
    - Padają oferty od agenta bramki parkingowej. Jeśli któraś zostanie przyjęta przez agenta samochodu, zostaje nawiązana umowa między agentami na moment wjazdu oraz cenę za godzinę parkowania. Utrwalenie jej odbywa się przez transakcję na blokchain.
    - Sesja kończy się po wjeździe samochodu na parking.
7. Po zamknięciu widoku ("x" lub opcja "close") widok wraca do głównego dashboardu, na którym widać samochód na parkingu oraz to jak długo znajduje się na parkingu. 
8. Po wybraniu samochodu można kliknąć opcję "leave parking". Wtedy ponownie agenci nawiązują konwersację widoczną na ekranie - obliczana jest należna płatność i realizowana jest transakcja. Po zweryfikowaniu pozystywnego przejścia płatności samochód opuszcza parking.
9. Faktyczne transakcje na blockchain można sprawdzić za pośrednictwem publicznego adresu wyświetlonego w punkcie 3. na [platformie dowodowej](https://daiaui.teawithsand.com/) lub na niezależnej stronie [whatsonchain](https://test.whatsonchain.com/) (którego API wykorzystujemy).
