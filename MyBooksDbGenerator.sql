-- MyBooks.Libri definition

CREATE TABLE `Libri` (
  `Isbn` varchar(13) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Titolo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Autore` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Pagine` int(10) unsigned NOT NULL,
  `PagineLette` int(10) unsigned NOT NULL,
  `Completato` tinyint(1) NOT NULL,
  `Impressioni` varchar(5000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Valutazione` tinyint(3) unsigned DEFAULT NULL,
  PRIMARY KEY (`Isbn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
