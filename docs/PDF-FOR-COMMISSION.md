# DAIA - Decentralize AI Agents

## Linki
- [Demo](https://daiademo.teawithsand.com/) - Demonstracja jednego z zastosowań biblioteki DAIA za pośrednictwem symulacji parkingu obsługiwanego przez agentów AI.
- [Platforma Dowodowa](https://daiaui.teawithsand.com/) - Landing page oraz strona, na której można sprawdzić transakcje na blockchain - umowy zawarte między agentami.
- [Dokumentacja](https://daiadocs.teawithsand.com/) - Dokumentacja.

## Dane logowania
- Login: `Jeffrey`
- Hasło: `V1J'WmGqu5rQ.oKH`

## Ograniczenia
1. Dostęp do strony jest ograniczony do użytkowników posiadających dane logowania (podane powyżej).
2. Demo działa w sieci **BSV Testnet**, a nie w sieci produkcyjnej (Mainnet). Oznacza to, że wszystkie transakcje, umowy i płatności są zapisywane w blockchainie BSV, ale z użyciem testowych monet, które nie mają wartości rynkowej.  
3. System będzie niedostępny od 8:00 dnia 10.01 (sobota) do 8:00 dnia 11.01 (niedziela).
4. Przy wyszukiwaniu po adresie portfela wyświetlane są wyłącznie transakcje **potwierdzone w blockchainie**, czyli takie, dla których istnieje pełna pewność zawarcia umowy między agentami.  
   Ponieważ potwierdzenie transakcji w BSV może trwać kilkanaście minut, na potrzeby działania w czasie rzeczywistym (wjazd i wyjazd z parkingu) agenci akceptują również transakcje **niepotwierdzone (mempool)**.  
   W interfejsie udostępniane są identyfikatory transakcji (TXID), które umożliwiają śledzenie ich statusu na platformie dowodowej także przed zatwierdzeniem w bloku.

## Samodzielne testowanie demo

1. Wejdź na stronę [demo](https://daiademo.teawithsand.com/).

2. Po zalogowaniu zapoznaj się z komunikatem startowym.

3. Utwórz agenta samochodu:
   - wybierz **"Configure new car"**,
   - postępuj zgodnie z instrukcjami,
   - w najprostszej wersji wybierz **predefiniowany klucz**. 

   - Opcjonalnie:
        - otwórz w nowej karcie link do portfela na WhatsOnChain w celu podglądu niepotwierdzonych transakcji,
        - zapisz tymczasowo **adres publiczny portfela BSV**, który jest widoczny na ekranie — pozwoli on później sprawdzić transakcje związane z tym portfelem,
        - zamiast predefiniowanego klucza możesz wygenerować nowy adres przez opcję **"Generate"** — w takim przypadku zasil go bezpłatnymi środkami z testnet faucet: https://scrypt.io/faucet/.  
          Pozyskanie środków może potrwać kilka minut; status najlepiej śledzić przez link do WhatsOnChain pojawiający się po kliknięciu **"Generate"**,
        - możesz zmienić instrukcje dla agenta samochodu dotyczące strategii ofertowania i warunków akceptacji,
        - możesz utworzyć więcej niż jednego agenta z różnymi instrukcjami.

4. (Opcjonalnie) Możesz zmodyfikować ustawienia agenta bramki parkingowej poprzez **"Gate settings"**  
   — np. zmienić politykę cenową lub parametry negocjacji.

5. Powinieneś mieć teraz co najmniej jeden pojazd.  
   Kliknij **"Enter parking"**, a następnie wybierz swój samochód przyciskiem **"Select"**.

6. Otworzy się widok rozmowy agentów:
   - agenta samochodu,
   - oraz agenta bramki parkingowej.

   W tym widoku:
   - agenci komunikują się w języku naturalnym oraz za pomocą **protokołu DAIA** (ustrukturyzowany format komunikatów),
   - rozpoczyna się negocjacja ceny parkowania,
   - walutą w demo są **satoshi** (najmniejsze jednostki BSV — analogiczne do groszy przy złotówkach).

   Przebieg:
   - agent bramki wysyła oferty cenowe,
   - agent samochodu może je przyjąć lub odrzucić,
   - po zaakceptowaniu oferty zostaje zawarta **umowa** określająca:
     - moment wjazdu,
     - cenę za godzinę parkowania,
   - umowa jest **utrwalana w blockchainie BSV** jako transakcja,
        - aby zobaczyć transakcję na platformie dowodowej kliknij **"View on DAIA platform"**; możliwa jest też weryfikacja na niezależnym eksploratorze poprzez **"View on WhatsOnChain.com"**.

   Sesja kończy się, gdy samochód wjeżdża na parking.

7. Po zamknięciu widoku rozmowy (**"X"** lub **"Close"**) wrócisz do głównego dashboardu.  
   Zobaczysz tam:
   - samochód zaparkowany na parkingu,
   - czas, przez jaki aktualnie tam przebywa.

8. Aby opuścić parking:
   - wybierz samochód,
   - kliknij **"Leave parking"**.

   Następnie:
   - agenci ponownie rozpoczynają rozmowę,
   - wyliczana jest należna opłata za parkowanie,
   - realizowana jest transakcja w BSV,
        - aby zobaczyć transakcję na platformie dowodowej kliknij **"View on DAIA platform"**; możliwa jest też weryfikacja na niezależnym eksploratorze poprzez **"View on WhatsOnChain.com"**,
   - po jej pozytywnej weryfikacji samochód opuszcza parking.

9. Po potwierdzeniu transakcji w blockchainie (po kilkunastu minutach) możesz wyświetlić wszystkie transakcje DAIA związane z portfelem, podając **publiczny adres portfela BSV z punktu 3** na:
   - platformie dowodowej: https://daiaui.teawithsand.com/ (te same dane logowania co do demo),
   - lub w niezależnym eksploratorze: https://test.whatsonchain.com/.

