-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3307
-- Creato il: Ott 13, 2026 alle 08:02
-- Versione del server: 10.11.11-MariaDB
-- Versione PHP: 8.1.31

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `local_clients`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `clients`
--

DROP TABLE IF EXISTS `clients`;
CREATE TABLE IF NOT EXISTS `clients` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `codice_cliente` varchar(30) NOT NULL,
  `ragione_sociale` varchar(180) NOT NULL,
  `partita_iva` varchar(20) DEFAULT NULL,
  `codice_fiscale` varchar(20) DEFAULT NULL,
  `city` varchar(100) NOT NULL DEFAULT 'VUOTO',
  `province` varchar(30) NOT NULL DEFAULT 'VUOTO',
  `zip_code` varchar(30) NOT NULL DEFAULT 'VUOTO',
  `indirizzo` varchar(220) NOT NULL,
  `country_id` int(11) NOT NULL DEFAULT 85,
  `city_ship` varchar(100) DEFAULT NULL,
  `province_ship` varchar(30) DEFAULT NULL,
  `zip_code_ship` varchar(30) DEFAULT NULL,
  `indirizzo_ship` varchar(220) DEFAULT NULL,
  `country_id_ship` int(11) NOT NULL DEFAULT 85,
  `contact` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `conctact_mail` varchar(50) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clients_codice_cliente` (`codice_cliente`),
  UNIQUE KEY `uk_clients_codice_cliente` (`codice_cliente`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `clients`
--

INSERT INTO `clients` (`id`, `codice_cliente`, `ragione_sociale`, `partita_iva`, `codice_fiscale`, `city`, `province`, `zip_code`, `indirizzo`, `country_id`, `city_ship`, `province_ship`, `zip_code_ship`, `indirizzo_ship`, `country_id_ship`, `contact`, `contact_phone`, `conctact_mail`, `logo_path`, `created_at`, `updated_at`) VALUES
(1, 'CLI001', 'ACME NEW', '12345678901', '2342342342343', 'Torino', 'TO', '10134', 'Via Luini 12', 85, 'TORINO', 'Torino', '10134', 'Via Tunisi 68/8', 85, 'Mr. Black', '180 - 800 788 555', 'black@black.com', '1787922570720-lexus.png', '2026-06-29 09:57:04', '2026-10-12 15:11:58'),
(2, 'CLI002', 'Rolls-Royce Holdings plc', '12345678901', '12345678901', 'Londra ', 'Greater London', 'N1 9FX', 'Kings Place, 90 York Way', 139, 'Londra ', 'Greater London', 'N1 9FX', 'Kings Place, 90 York Way', 51, NULL, NULL, NULL, '1787924869424-zone_2NEW.jpg', '2026-08-27 15:45:44', '2026-10-12 13:17:47'),
(4, 'CL004', 'ACME', '23423432442', '2342342342343', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Tunisi 68/8', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1787924841530-unnamed.jpg', '2026-08-28 09:34:14', '2026-08-31 09:57:28'),
(5, 'CL003', 'ACME ggg', '23423432442', '2342342342343', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Tunisi 68/8', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1787922638543-Nuova-Fiat-Panda-1024x575.jpg', '2026-08-28 13:10:38', '2026-08-31 09:12:46'),
(6, 'CLI006', 'altro cliente', '23423432442', '2342342342343', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Tunisi 68/8', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1787926041821-tabelet.jpg', '2026-08-28 14:07:21', '2026-08-31 09:52:02'),
(10, 'CLI010', 'Cliente 3 di prova S.r.l.', '12345678901', NULL, 'VUOTO', 'VUOTO', 'VUOTO', 'Via Tunisi 68/8', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1788167543787-leopardo.png', '2026-08-28 14:58:15', '2026-08-31 09:58:28'),
(11, 'CLI011', 'ACME', '12345678901', '2342342342343xx', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Luini 122', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1787922570720-lexus.png', '2026-08-31 09:41:01', '2026-09-08 09:30:33'),
(12, 'CLI012', 'altro cliente', '23423432442', '2342342342343', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Tunisi 68/8', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1787926041821-tabelet.jpg', '2026-08-31 09:47:44', '2026-08-31 09:47:44'),
(13, 'CLI013', 'ACME', '12345678901', '2342342342343', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Luini 12', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1787922570720-lexus.png', '2026-08-31 09:54:38', '2026-08-31 09:54:38'),
(14, 'CLI014', 'ACME xxx', '23423432442', '2342342342343', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Filedelfia 15', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1787924841530-unnamed.jpg', '2026-08-31 09:56:01', '2026-08-31 09:56:29'),
(15, 'CLI015', 'ACME ggg', '23423432442', '2342342342343', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Tunisi 68/8', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1787922638543-Nuova-Fiat-Panda-1024x575.jpg', '2026-08-31 09:59:39', '2026-08-31 09:59:39'),
(17, 'CLI017', 'Cliente di prova S.r.l.', '12345678901', '12345678901', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Roma 10', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1787924869424-zone_2NEW.jpg', '2026-09-08 10:10:41', '2026-09-08 10:10:41'),
(18, 'CLI018', 'xxxxx', '345235234512345', '5345345435455', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Del Pino, 8', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1788870376597-tabelet.jpg', '2026-09-08 12:26:16', '2026-09-08 12:26:16'),
(19, 'CLI019', 'Nuovo Cliente', '01234567891', '0123456789123456', 'VUOTO', 'VUOTO', 'VUOTO', 'Via Roma 5', 85, NULL, NULL, NULL, NULL, 85, NULL, NULL, NULL, '1788941605612-test2.jpg', '2026-09-09 08:13:25', '2026-09-09 08:13:25');

-- --------------------------------------------------------

--
-- Struttura della tabella `countries`
--

DROP TABLE IF EXISTS `countries`;
CREATE TABLE IF NOT EXISTS `countries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `codice_iso2` char(2) NOT NULL,
  `codice_iso3` char(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=195 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `countries`
--

INSERT INTO `countries` (`id`, `nome`, `codice_iso2`, `codice_iso3`) VALUES
(1, 'Afghanistan', 'AF', 'AFG'),
(2, 'Albania', 'AL', 'ALB'),
(3, 'Algeria', 'DZ', 'DZA'),
(4, 'Andorra', 'AD', 'AND'),
(5, 'Angola', 'AO', 'AGO'),
(6, 'Antigua and Barbuda', 'AG', 'ATG'),
(7, 'Argentina', 'AR', 'ARG'),
(8, 'Armenia', 'AM', 'ARM'),
(9, 'Australia', 'AU', 'AUS'),
(10, 'Austria', 'AT', 'AUT'),
(11, 'Azerbaijan', 'AZ', 'AZE'),
(12, 'Bahamas', 'BS', 'BHS'),
(13, 'Bahrain', 'BH', 'BHR'),
(14, 'Bangladesh', 'BD', 'BGD'),
(15, 'Barbados', 'BB', 'BRB'),
(16, 'Belgium', 'BE', 'BEL'),
(17, 'Belize', 'BZ', 'BLZ'),
(18, 'Benin', 'BJ', 'BEN'),
(19, 'Bhutan', 'BT', 'BTN'),
(20, 'Belarus', 'BY', 'BLR'),
(21, 'Bolivia', 'BO', 'BOL'),
(22, 'Bosnia and Herzegovina', 'BA', 'BIH'),
(23, 'Botswana', 'BW', 'BWA'),
(24, 'Brazil', 'BR', 'BRA'),
(25, 'Brunei', 'BN', 'BRN'),
(26, 'Bulgaria', 'BG', 'BGR'),
(27, 'Burkina Faso', 'BF', 'BFA'),
(28, 'Burundi', 'BI', 'BDI'),
(29, 'Cambodia', 'KH', 'KHM'),
(30, 'Cameroon', 'CM', 'CMR'),
(31, 'Canada', 'CA', 'CAN'),
(32, 'Cape Verde', 'CV', 'CPV'),
(33, 'Chad', 'TD', 'TCD'),
(34, 'Chile', 'CL', 'CHL'),
(35, 'China', 'CN', 'CHN'),
(36, 'Cyprus', 'CY', 'CYP'),
(37, 'Vatican City', 'VA', 'VAT'),
(38, 'Colombia', 'CO', 'COL'),
(39, 'Comoros', 'KM', 'COM'),
(40, 'North Korea', 'KP', 'PRK'),
(41, 'South Korea', 'KR', 'KOR'),
(42, 'Ivory Coast', 'CI', 'CIV'),
(43, 'Costa Rica', 'CR', 'CRI'),
(44, 'Croatia', 'HR', 'HRV'),
(45, 'Cuba', 'CU', 'CUB'),
(46, 'Denmark', 'DK', 'DNK'),
(47, 'Dominica', 'DM', 'DMA'),
(48, 'Ecuador', 'EC', 'ECU'),
(49, 'Egypt', 'EG', 'EGY'),
(50, 'El Salvador', 'SV', 'SLV'),
(51, 'United Arab Emirates', 'AE', 'ARE'),
(52, 'Eritrea', 'ER', 'ERI'),
(53, 'Estonia', 'EE', 'EST'),
(54, 'Eswatini', 'SZ', 'SWZ'),
(55, 'Ethiopia', 'ET', 'ETH'),
(56, 'Fiji', 'FJ', 'FJI'),
(57, 'Philippines', 'PH', 'PHL'),
(58, 'Finland', 'FI', 'FIN'),
(59, 'France', 'FR', 'FRA'),
(60, 'Gabon', 'GA', 'GAB'),
(61, 'Gambia', 'GM', 'GMB'),
(62, 'Georgia', 'GE', 'GEO'),
(63, 'Germany', 'DE', 'DEU'),
(64, 'Ghana', 'GH', 'GHA'),
(65, 'Jamaica', 'JM', 'JAM'),
(66, 'Japan', 'JP', 'JPN'),
(67, 'Djibouti', 'DJ', 'DJI'),
(68, 'Jordan', 'JO', 'JOR'),
(69, 'Greece', 'GR', 'GRC'),
(70, 'Grenada', 'GD', 'GRD'),
(71, 'Guatemala', 'GT', 'GTM'),
(72, 'Guinea', 'GN', 'GIN'),
(73, 'Guinea-Bissau', 'GW', 'GNB'),
(74, 'Equatorial Guinea', 'GQ', 'GNQ'),
(75, 'Guyana', 'GY', 'GUY'),
(76, 'Haiti', 'HT', 'HTI'),
(77, 'Honduras', 'HN', 'HND'),
(78, 'India', 'IN', 'IND'),
(79, 'Indonesia', 'ID', 'IDN'),
(80, 'Iran', 'IR', 'IRN'),
(81, 'Iraq', 'IQ', 'IRQ'),
(82, 'Ireland', 'IE', 'IRL'),
(83, 'Iceland', 'IS', 'ISL'),
(84, 'Israel', 'IL', 'ISR'),
(85, 'Italy', 'IT', 'ITA'),
(86, 'Kazakhstan', 'KZ', 'KAZ'),
(87, 'Kenya', 'KE', 'KEN'),
(88, 'Kyrgyzstan', 'KG', 'KGZ'),
(89, 'Kiribati', 'KI', 'KIR'),
(90, 'Kuwait', 'KW', 'KWT'),
(91, 'Laos', 'LA', 'LAO'),
(92, 'Lesotho', 'LS', 'LSO'),
(93, 'Latvia', 'LV', 'LVA'),
(94, 'Lebanon', 'LB', 'LBN'),
(95, 'Liberia', 'LR', 'LBR'),
(96, 'Libya', 'LY', 'LBY'),
(97, 'Liechtenstein', 'LI', 'LIE'),
(98, 'Lithuania', 'LT', 'LTU'),
(99, 'Luxembourg', 'LU', 'LUX'),
(100, 'North Macedonia', 'MK', 'MKD'),
(101, 'Madagascar', 'MG', 'MDG'),
(102, 'Malawi', 'MW', 'MWI'),
(103, 'Malaysia', 'MY', 'MYS'),
(104, 'Maldives', 'MV', 'MDV'),
(105, 'Mali', 'ML', 'MLI'),
(106, 'Malta', 'MT', 'MLT'),
(107, 'Morocco', 'MA', 'MAR'),
(108, 'Marshall Islands', 'MH', 'MHL'),
(109, 'Mauritania', 'MR', 'MRT'),
(110, 'Mauritius', 'MU', 'MUS'),
(111, 'Mexico', 'MX', 'MEX'),
(112, 'Micronesia', 'FM', 'FSM'),
(113, 'Moldova', 'MD', 'MDA'),
(114, 'Monaco', 'MC', 'MCO'),
(115, 'Mongolia', 'MN', 'MNG'),
(116, 'Montenegro', 'ME', 'MNE'),
(117, 'Mozambique', 'MZ', 'MOZ'),
(118, 'Myanmar', 'MM', 'MMR'),
(119, 'Namibia', 'NA', 'NAM'),
(120, 'Nauru', 'NR', 'NRU'),
(121, 'Nepal', 'NP', 'NPL'),
(122, 'Nicaragua', 'NI', 'NIC'),
(123, 'Niger', 'NE', 'NER'),
(124, 'Nigeria', 'NG', 'NGA'),
(125, 'Norway', 'NO', 'NOR'),
(126, 'New Zealand', 'NZ', 'NZL'),
(127, 'Oman', 'OM', 'OMN'),
(128, 'Netherlands', 'NL', 'NLD'),
(129, 'Pakistan', 'PK', 'PAK'),
(130, 'Palau', 'PW', 'PLW'),
(131, 'Palestine', 'PS', 'PSE'),
(132, 'Panama', 'PA', 'PAN'),
(133, 'Papua New Guinea', 'PG', 'PNG'),
(134, 'Paraguay', 'PY', 'PRY'),
(135, 'Peru', 'PE', 'PER'),
(136, 'Poland', 'PL', 'POL'),
(137, 'Portugal', 'PT', 'PRT'),
(138, 'Qatar', 'QA', 'QAT'),
(139, 'United Kingdom', 'GB', 'GBR'),
(140, 'Central African Republic', 'CF', 'CAF'),
(141, 'Czechia', 'CZ', 'CZE'),
(142, 'Republic of the Congo', 'CG', 'COG'),
(143, 'Democratic Republic of the Congo', 'CD', 'COD'),
(144, 'Dominican Republic', 'DO', 'DOM'),
(145, 'Romania', 'RO', 'ROU'),
(146, 'Rwanda', 'RW', 'RWA'),
(147, 'Russia', 'RU', 'RUS'),
(148, 'Saint Kitts and Nevis', 'KN', 'KNA'),
(149, 'Saint Lucia', 'LC', 'LCA'),
(150, 'Saint Vincent and the Grenadines', 'VC', 'VCT'),
(151, 'Samoa', 'WS', 'WSM'),
(152, 'San Marino', 'SM', 'SMR'),
(153, 'Sao Tome and Principe', 'ST', 'STP'),
(154, 'Saudi Arabia', 'SA', 'SAU'),
(155, 'Senegal', 'SN', 'SEN'),
(156, 'Serbia', 'RS', 'SRB'),
(157, 'Seychelles', 'SC', 'SYC'),
(158, 'Sierra Leone', 'SL', 'SLE'),
(159, 'Singapore', 'SG', 'SGP'),
(160, 'Syria', 'SY', 'SYR'),
(161, 'Slovakia', 'SK', 'SVK'),
(162, 'Slovenia', 'SI', 'SVN'),
(163, 'Solomon Islands', 'SB', 'SLB'),
(164, 'Somalia', 'SO', 'SOM'),
(165, 'South Africa', 'ZA', 'ZAF'),
(166, 'South Sudan', 'SS', 'SSD'),
(167, 'Spain', 'ES', 'ESP'),
(168, 'Sri Lanka', 'LK', 'LKA'),
(169, 'Sudan', 'SD', 'SDN'),
(170, 'Suriname', 'SR', 'SUR'),
(171, 'Sweden', 'SE', 'SWE'),
(172, 'Switzerland', 'CH', 'CHE'),
(173, 'Tajikistan', 'TJ', 'TJK'),
(174, 'Tanzania', 'TZ', 'TZA'),
(175, 'Thailand', 'TH', 'THA'),
(176, 'Timor-Leste', 'TL', 'TLS'),
(177, 'Togo', 'TG', 'TGO'),
(178, 'Tonga', 'TO', 'TON'),
(179, 'Trinidad and Tobago', 'TT', 'TTO'),
(180, 'Tunisia', 'TN', 'TUN'),
(181, 'Turkey', 'TR', 'TUR'),
(182, 'Turkmenistan', 'TM', 'TKM'),
(183, 'Tuvalu', 'TV', 'TUV'),
(184, 'Ukraine', 'UA', 'UKR'),
(185, 'Uganda', 'UG', 'UGA'),
(186, 'Hungary', 'HU', 'HUN'),
(187, 'Uruguay', 'UY', 'URY'),
(188, 'Uzbekistan', 'UZ', 'UZB'),
(189, 'Vanuatu', 'VU', 'VUT'),
(190, 'Venezuela', 'VE', 'VEN'),
(191, 'Vietnam', 'VN', 'VNM'),
(192, 'Yemen', 'YE', 'YEM'),
(193, 'Zambia', 'ZM', 'ZMB'),
(194, 'Zimbabwe', 'ZW', 'ZWE');

-- --------------------------------------------------------

--
-- Struttura della tabella `invoices`
--

DROP TABLE IF EXISTS `invoices`;
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_owner_id` int(11) NOT NULL DEFAULT 1,
  `invoice_number` varchar(30) NOT NULL,
  `invoice_date` date NOT NULL,
  `payment_due_date` date DEFAULT NULL,
  `payment_method_id` int(10) UNSIGNED DEFAULT NULL,
  `document_type` varchar(20) NOT NULL DEFAULT 'INVOICE',
  `client_id` int(10) UNSIGNED NOT NULL,
  `taxable_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invoice_number` (`invoice_number`),
  KEY `idx_invoices_client` (`client_id`),
  KEY `idx_invoices_payment_method` (`payment_method_id`),
  KEY `user_owner_id` (`user_owner_id`)
) ENGINE=MyISAM AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `invoices`
--

INSERT INTO `invoices` (`id`, `user_owner_id`, `invoice_number`, `invoice_date`, `payment_due_date`, `payment_method_id`, `document_type`, `client_id`, `taxable_amount`, `vat_amount`, `total_amount`, `status`, `notes`, `created_at`, `updated_at`) VALUES
(5, 1, 'FT2026003', '2026-09-13', '2026-09-11', 3, 'Invoice', 14, 579.40, 127.46, 706.86, 'ISSUED', 'note', '2026-09-16 13:56:33', '2026-10-12 12:13:00'),
(4, 1, 'FT2026002', '2026-09-12', '2026-09-12', 2, 'Delivery note', 14, 829.30, 182.44, 1011.74, 'PAID', 'note', '2026-09-16 13:44:11', '2026-10-12 12:09:23'),
(6, 1, 'FT2026004', '2026-09-30', '2026-09-05', 9, 'Quote', 2, 17705.60, 3895.23, 21600.83, 'DRAFT', 'note', '2026-10-07 17:23:20', '2026-10-12 16:07:01'),
(7, 1, 'FT2026005', '2026-10-07', '2026-10-17', 1, 'Invoice', 2, 9939.90, 2186.78, 12126.68, 'ISSUED', NULL, '2026-10-12 11:48:43', '2026-10-12 16:00:09'),
(8, 5, 'FT2026006', '2026-10-12', '2026-10-24', 10, 'Invoice', 6, 1900.00, 418.00, 2318.00, 'DRAFT', NULL, '2026-10-12 16:44:06', '2026-10-12 16:44:06'),
(9, 1, 'FT2026007', '2026-10-11', '2026-10-22', 10, 'Invoice', 6, 17000.00, 3740.00, 20740.00, 'DRAFT', NULL, '2026-10-12 16:50:36', '2026-10-12 16:50:51');

-- --------------------------------------------------------

--
-- Struttura della tabella `invoicestatuses`
--

DROP TABLE IF EXISTS `invoicestatuses`;
CREATE TABLE IF NOT EXISTS `invoicestatuses` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invoiceStatuses_code` (`code`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `invoicestatuses`
--

INSERT INTO `invoicestatuses` (`id`, `code`, `name`) VALUES
(1, 'DRAFT', 'Bozza'),
(2, 'ISSUED', 'Emessa'),
(3, 'PAID', 'Pagata'),
(4, 'CANCELLED', 'Annullata');

-- --------------------------------------------------------

--
-- Struttura della tabella `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 1.00,
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `vat_rate` decimal(5,2) NOT NULL DEFAULT 22.00,
  `taxable_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_items_invoice` (`invoice_id`),
  KEY `idx_invoice_items_product` (`product_id`)
) ENGINE=MyISAM AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `invoice_items`
--

INSERT INTO `invoice_items` (`id`, `invoice_id`, `product_id`, `description`, `quantity`, `unit_price`, `discount_percent`, `vat_rate`, `taxable_amount`, `vat_amount`, `total_amount`, `sort_order`) VALUES
(80, 5, 3, 'Mouse Wireless', 3.00, 29.90, 0.00, 22.00, 89.70, 19.73, 109.43, 2),
(79, 5, 3, 'Mouse Wireless', 3.00, 29.90, 0.00, 22.00, 89.70, 19.73, 109.43, 1),
(78, 5, 5, 'OPPO 94 5G', 2.00, 200.00, 0.00, 22.00, 400.00, 88.00, 488.00, 0),
(76, 4, 3, 'Mouse Wireless', 3.00, 29.90, 0.00, 22.00, 89.70, 19.73, 109.43, 2),
(75, 4, 3, 'Mouse Wireless', 3.00, 29.90, 0.00, 22.00, 89.70, 19.73, 109.43, 1),
(74, 4, 5, 'OPPO 94 5G', 2.00, 200.00, 0.00, 22.00, 400.00, 88.00, 488.00, 0),
(122, 6, 4, 'Tastiera GXTrust', 499.00, 40.00, 15.00, 22.00, 16966.00, 3732.52, 20698.52, 3),
(121, 6, 2, 'Monitor 27 pollici', 1.00, 249.90, 0.00, 22.00, 249.90, 54.98, 304.88, 2),
(120, 6, 3, 'Mouse Wireless', 3.00, 29.90, 0.00, 22.00, 89.70, 19.73, 109.43, 1),
(119, 6, 5, 'OPPO 94 5G', 2.00, 200.00, 0.00, 22.00, 400.00, 88.00, 488.00, 0),
(106, 7, 5, 'OPPO 94 5G', 50.00, 200.00, 10.00, 22.00, 9000.00, 1980.00, 10980.00, 2),
(105, 7, 4, 'Tastiera GXTrust', 1.00, 40.00, 0.00, 22.00, 40.00, 8.80, 48.80, 1),
(77, 4, 2, 'Monitor 27 pollici', 1.00, 249.90, 0.00, 22.00, 249.90, 54.98, 304.88, 3),
(104, 7, 10, 'Notebook 15 pollici', 1.00, 899.90, 0.00, 22.00, 899.90, 197.98, 1097.88, 0),
(123, 8, 5, 'OPPO 94 5G', 10.00, 200.00, 5.00, 22.00, 1900.00, 418.00, 2318.00, 0),
(125, 9, 5, 'OPPO 94 5G', 100.00, 200.00, 15.00, 22.00, 17000.00, 3740.00, 20740.00, 0);

-- --------------------------------------------------------

--
-- Struttura della tabella `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_methods_code` (`code`)
) ENGINE=MyISAM AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `payment_methods`
--

INSERT INTO `payment_methods` (`id`, `code`, `name`, `active`, `sort_order`) VALUES
(1, 'BANK_TRANSFER', 'Bank transfer', 1, 11),
(2, 'CASH', 'Cash', 1, 20),
(3, 'CREDIT_CARD', 'Credit card', 1, 30),
(4, 'DEBIT_CARD', 'Debit card', 1, 40),
(5, 'RIBA', 'Bank draft (Ri.Ba.)', 1, 50),
(6, 'DIRECT_DEBIT', 'Direct debit', 1, 60),
(7, 'CHECK', 'Check', 1, 70),
(8, 'OTHER', 'Other', 1, 100),
(9, 'SATYSPAY', 'SatysPay', 1, 85),
(10, 'PAYPAL', 'PayPal', 1, 90),
(12, 'TERST', 'test', 0, 3);

-- --------------------------------------------------------

--
-- Struttura della tabella `productcategories`
--

DROP TABLE IF EXISTS `productcategories`;
CREATE TABLE IF NOT EXISTS `productcategories` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_productCategories_name` (`name`)
) ENGINE=MyISAM AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `productcategories`
--

INSERT INTO `productcategories` (`id`, `name`, `description`, `active`, `sort_order`) VALUES
(1, 'Notebook', 'Computer portatili', 1, 10),
(2, 'Desktop', 'Computer desktop e workstation', 1, 20),
(3, 'Monitor', 'Monitor e display', 1, 30),
(4, 'Tablet', 'Tablet e dispositivi mobili', 1, 40),
(5, 'Smartphone', 'Smartphone e telefoni cellulari', 1, 50),
(6, 'Server', 'Server e sistemi rack', 1, 60),
(7, 'Networking', 'Router, switch, access point e dispositivi di rete', 1, 70),
(8, 'Stampanti', 'Stampanti e multifunzione', 1, 80),
(9, 'Scanner', 'Scanner documentali e fotografici', 1, 90),
(10, 'Tastiere', 'Tastiere cablate e wireless', 1, 100),
(11, 'Mouse', 'Mouse e dispositivi di puntamento', 1, 110),
(12, 'Webcam', 'Webcam e dispositivi video', 1, 120),
(13, 'Audio', 'Cuffie, microfoni e altoparlanti', 1, 130),
(14, 'Storage', 'Hard disk, SSD e sistemi di archiviazione', 1, 140),
(15, 'Memorie', 'RAM, schede di memoria e chiavette USB', 1, 150),
(16, 'Componenti PC', 'CPU, schede madri, GPU e altri componenti', 1, 160),
(17, 'Accessori', 'Accessori informatici generici', 1, 170),
(18, 'Cavi e adattatori', 'Cavi, adattatori e convertitori', 1, 180),
(19, 'UPS e alimentazione', 'UPS, alimentatori e dispositivi di alimentazione', 1, 190),
(20, 'Software', 'Software e licenze', 1, 200),
(21, 'Altro', 'Altri prodotti informatici', 1, 999),
(0, 'Materiale', 'Materiale generico per informatica', 1, 5),
(23, 'Componenti', 'Componenti elettronici', 1, 201);

-- --------------------------------------------------------

--
-- Struttura della tabella `products`
--

DROP TABLE IF EXISTS `products`;
CREATE TABLE IF NOT EXISTS `products` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `codice` varchar(50) NOT NULL,
  `nome` varchar(150) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `category_id` int(11) NOT NULL DEFAULT 0,
  `prezzo` decimal(10,2) NOT NULL DEFAULT 0.00,
  `costo` decimal(10,2) DEFAULT NULL,
  `aliquota_iva` decimal(5,2) NOT NULL DEFAULT 22.00,
  `quantita` int(11) NOT NULL DEFAULT 0,
  `scorta_minima` int(11) NOT NULL DEFAULT 0,
  `unita_misura` varchar(20) NOT NULL DEFAULT 'PZ',
  `barcode` varchar(50) DEFAULT NULL,
  `immagine` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_codice` (`codice`),
  UNIQUE KEY `uk_products_barcode` (`barcode`),
  KEY `idx_products_nome` (`nome`),
  KEY `idx_products_categoria` (`categoria`),
  KEY `idx_products_active` (`active`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `products`
--

INSERT INTO `products` (`id`, `codice`, `nome`, `descrizione`, `categoria`, `category_id`, `prezzo`, `costo`, `aliquota_iva`, `quantita`, `scorta_minima`, `unita_misura`, `barcode`, `immagine`, `active`, `created_at`, `updated_at`) VALUES
(1, 'PRD001', 'Notebook 15 pollici', '<p>Notebook&nbsp;professionale&nbsp;15&nbsp;pollici</p><ol><li><p>erwtterwterwtewr</p></li><li><p>efdyerterwterwt</p></li><li><p>ertygertyertyertert</p></li><li><p>eryeryerertert</p></li><li><p>eryeryeryeryer</p></li><li><p>saeryeyewyerwye</p></li></ol><p></p>', 'Computer', 1, 400.00, 650.00, 22.00, 11, 5, 'PZ', '800000000001', '/uploads/products/1788255404947-hazard_27861484923613.jpg', 1, '2026-08-31 13:54:26', '2026-09-16 10:25:11'),
(2, 'PRD002', 'Monitor 27 pollici', '<p><strong>Monitor&nbsp;</strong>IPS&nbsp;Full&nbsp;HD&nbsp;da&nbsp;27&nbsp;pollici</p>', 'Monitor', 3, 249.90, 170.00, 22.00, 15, 3, 'PZ', '800000000002', '/uploads/products/1788251786282-hazard_27861485112774.jpg', 1, '2026-08-31 13:54:26', '2026-09-01 09:12:19'),
(3, 'PRD003', 'Mouse Wireless', '<p>Mouse&nbsp;wireless&nbsp;ergonomico</p>', 'Accessori', 11, 29.90, 14.50, 22.00, 50, 10, 'PZ', '800000000003', '/uploads/products/1788255584868-hazard_27861777046914.jpg', 1, '2026-08-31 13:54:26', '2026-09-01 09:39:45'),
(4, 'PRD004', 'Tastiera GXTrust', '<p>tastiera speciale</p>', 'Accessori', 17, 40.00, 20.00, 22.00, 1, 19, 'PZ', NULL, '/uploads/products/1788187610666-Nuova-Fiat-Panda-1024x575.jpg', 1, '2026-08-31 14:28:06', '2026-09-16 10:40:12'),
(5, 'PRD005', 'OPPO 94 5G', '<p>5g</p>', 'SmatPhone', 5, 200.00, 180.00, 22.00, 1000, 10, 'PZ', '800000000099', '/uploads/products/1788188307985-smartphone-iphone.png', 1, '2026-08-31 14:58:28', '2026-10-12 13:49:41'),
(6, 'PRD006', 'Tablet Android', '<p>Tablet&nbsp;android</p>', NULL, 4, 150.00, 120.00, 22.00, 10, 5, 'PZ', 'B00000003333', '/uploads/products/1788255794810-zone_small.jpg', 1, '2026-09-01 09:43:15', '2026-09-01 09:43:15'),
(10, 'PRD010', 'Notebook 15 pollici', '<p>Notebook&nbsp;professionale&nbsp;15&nbsp;pollici</p><ol><li>erwtterwterwtewr</li><li>efdyerterwterwt</li><li>ertygertyertyertert</li><li>eryeryerertert</li><li>eryeryeryeryer</li><li>saeryeyewyerwye</li></ol>', NULL, 1, 899.90, 650.00, 22.00, 10, 5, 'PZ', 'trtewrtrewtrewrtfesdrtewartewrawearwearw', '/uploads/products/1788255404947-hazard_27861484923613.jpg', 0, '2026-09-08 13:54:11', '2026-09-08 13:54:38'),
(11, 'PRD011', 'Il Prodoto', '<p>descrizione</p><ol><li><p>buono</p></li><li><p>cattivo</p></li></ol><p></p>', NULL, 4, 120.00, 100.00, 22.00, 100, 20, 'PZ', '3452342535345', '/uploads/products/1788942615082-tabelet.jpg', 1, '2026-09-09 08:30:15', '2026-09-09 08:30:15'),
(12, 'PRD012', 'Notebook 15 pollici', '<p>Notebook&nbsp;professionale&nbsp;15&nbsp;pollici</p><ol><li><p>erwtterwterwtewr</p></li><li><p>efdyerterwterwt</p></li><li><p>ertygertyertyertert</p></li><li><p>eryeryerertert</p></li><li><p>eryeryeryeryer</p></li><li><p>saeryeyewyerwye</p></li></ol><p></p>', NULL, 1, 899.90, 650.00, 22.00, 10, 5, 'PZ', NULL, '/uploads/products/1788255404947-hazard_27861484923613.jpg', 0, '2026-09-09 08:30:37', '2026-09-09 08:30:43');

-- --------------------------------------------------------

--
-- Struttura della tabella `product_quantity_discounts`
--

DROP TABLE IF EXISTS `product_quantity_discounts`;
CREATE TABLE IF NOT EXISTS `product_quantity_discounts` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` int(10) UNSIGNED NOT NULL,
  `min_qty` int(10) UNSIGNED NOT NULL,
  `max_qty` int(10) UNSIGNED DEFAULT NULL,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_min_qty` (`product_id`,`min_qty`)
) ;

--
-- Dump dei dati per la tabella `product_quantity_discounts`
--

INSERT INTO `product_quantity_discounts` (`id`, `product_id`, `min_qty`, `max_qty`, `discount_percent`) VALUES
(1, 4, 1, 9, 0.00),
(2, 4, 10, 49, 5.00),
(3, 4, 50, 99, 10.00),
(4, 4, 100, 499, 15.00),
(5, 4, 500, NULL, 20.00),
(6, 5, 1, 9, 0.00),
(7, 5, 10, 49, 5.00),
(8, 5, 50, 99, 10.00),
(9, 5, 100, 499, 15.00),
(10, 5, 500, NULL, 20.00);

-- --------------------------------------------------------

--
-- Struttura della tabella `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `cognome` varchar(100) DEFAULT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'user',
  `level` int(10) UNSIGNED NOT NULL DEFAULT 10,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `nome`, `cognome`, `role`, `level`, `active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@example.com', '$2b$10$ajNVGUq3kX8yMHl6kCIt8e3S3MToSCb3e/aLhIlYwZK9PLn0R3WG.', 'Flavio', 'Bonandini', 'admin', 90, 1, '2026-10-12 16:46:54', '2026-08-31 12:31:10', '2026-10-12 14:46:54'),
(2, 'flavio', 'flavio.bonandini@gmail.com', '$2b$10$4u5trxAwp5rPlQouKRVjO.RYi7U8u7iERpMH0JVGUcSW5bPnjDya2', 'Flavio', 'Bonandini', 'superadmin', 90, 1, '2026-09-02 10:49:14', '2026-08-31 13:40:51', '2026-09-02 08:49:14'),
(5, 'user', 'user@user.it', '$2b$10$sJxxFBtiwN989oJQyU1yhuJa2SWJBvLuGnYpBVS8IJJF5zJApeDCm', 'user', 'user', 'user', 10, 1, '2026-10-12 16:40:50', '2026-09-08 15:32:24', '2026-10-12 14:40:50');

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `product_quantity_discounts`
--
ALTER TABLE `product_quantity_discounts`
  ADD CONSTRAINT `fk_product_quantity_discounts_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
