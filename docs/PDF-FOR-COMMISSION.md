# DAIA - Decentralize AI Agents

## Linki
- [Demo](https://daiademo.teawithsand.com/) - Demonstracja jednego z zastosowań biblioteki DAIA za pośrednictwem symulacji parkingu obsługiwanego przez agentów AI.
- [Platforma Dowodowa](https://daiaui.teawithsand.com/) - Landing page oraz strona, na której można sprawdzić transakcje na blockchain - umowy zawarte między agentami.
- [Dokumentacja](https://daiadocs.teawithsand.com/) - Dokumentacja.

## Dane logowania
- Login: `Jeffrey`
- Hasło: `SerwerJestNaMojejTajnejWyspieUwU`

## Ograniczenia
1. Demo jest przeznaczone do uruchamiania na komputerze (desktop). Interfejs nie jest dostosowany do telefonów ani tabletów.
2. Dostęp do strony jest ograniczony do użytkowników posiadających dane logowania (podane powyżej).

## Samodzielne testowanie demo

1. Wejdź na stronę [demo](https://daiademo.teawithsand.com/) i zaloguj się przy użyciu podanych danych.

2. Po zalogowaniu zapoznaj się z komunikatem startowym wyświetlonym przez aplikację.

3. Utwórz agenta samochodu:
   - wybierz **"Configure new car"**,
   - postępuj zgodnie z instrukcjami,
   - w najprostszej wersji wybierz **predefiniowany klucz**.

   Po utworzeniu agenta:
   - zapisz tymczasowo **adres publiczny portfela BSV**, które są widoczne na ekranie — będą używane do transakcji w trakcie symulacji.

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
   - walutą w demo są **satoshi** (najmniejsze jednostki BSV – analogiczne do groszy przy złotówkach).

   Przebieg:
   - agent bramki wysyła oferty cenowe,
   - agent samochodu może je przyjąć lub odrzucić,
   - po zaakceptowaniu oferty zostaje zawarta **umowa** określająca:
     - moment wjazdu,
     - cenę za godzinę parkowania,
   - umowa jest **utrwalana w blockchainie BSV** jako transakcja.

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
   - po jej pozytywnej weryfikacji samochód opuszcza parking.

9. Faktyczne transakcje na blockchain możesz zweryfikować podając **publiczny adres portfela BSV z punktu 3.** na [platformie dowodowej](https://daiaui.teawithsand.com/) lub niezależnym [WhatsOnChain](https://test.whatsonchain.com/).
