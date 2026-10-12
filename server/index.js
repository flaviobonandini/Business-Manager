const express = require('express');
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());
const db = require("./db/db");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const PORT = process.env.PORT || 5000;

const path = require('path');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {

        cb(
            null,
            path.join(__dirname, 'uploads', 'logos')
        );

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + '-' + file.originalname;

        cb(null, uniqueName);

    }

});

const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    const token =
        authHeader &&
        authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Token mancante"
        });
    }

    jwt.verify(
        token,
        JWT_SECRET,
        (error, user) => {

            if (error) {
                return res.status(401).json({
                    success: false,
                    message: "Token non valido o scaduto"
                });
            }

            req.user = user;

            next();
        }
    );
}

function requireAdmin(req, res, next) {

    const role = String(req.user?.role || "").toLowerCase();

    if (
        role !== "admin" &&
        role !== "superadmin"
    ) {
        return res.status(403).json({
            success: false,
            message: "Accesso riservato agli amministratori"
        });
    }

    next();
}

const upload = multer({ storage });

app.use(
    '/uploads',
    express.static(path.join(__dirname, 'uploads'))
);

const productStorage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(
            null,
            path.join(__dirname, 'uploads', 'products')
        );

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + '-' + file.originalname;

        cb(null, uniqueName);

    }

});

const uploadProduct = multer({
    storage: productStorage
});

app.get(
    "/api/test-auth",
    authenticateToken,
    (req, res) => {

        res.json({
            success: true,
            message: "Token valido",
            user: req.user
        });
    }
);

app.post("/api/login", async (req, res) => {
    //admin
    //Admin123!
    const { username, password } = req.body;

    let conn;

    try {

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username e password obbligatori"
            });
        }

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                id,
                username,
                email,
                password_hash,
                nome,
                cognome,
                role,
                level,
                active
            FROM users
            WHERE username = ?
            LIMIT 1
        `, [username]);

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Username o password non corretti"
            });
        }

        const user = rows[0];

        if (!user.active) {
            return res.status(403).json({
                success: false,
                message: "Utente disabilitato"
            });
        }

        const passwordCorretta = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordCorretta) {
            return res.status(401).json({
                success: false,
                message: "Username o password non corretti"
            });
        }

        // Aggiorno ultimo accesso
        await conn.query(
            "UPDATE users SET last_login = NOW() WHERE id = ?",
            [user.id]
        );

        const token = jwt.sign(
            {
                id: Number(user.id),
                username: user.username,
                role: user.role,
                level: Number(user.level)
            },
            JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        return res.json({
            success: true,
            message: "Login effettuato correttamente",

            token: token,

            user: {
                id: Number(user.id),
                username: user.username,
                email: user.email,
                nome: user.nome,
                cognome: user.cognome,
                role: user.role,
                level: Number(user.level)
            }
        });

    } catch (error) {

        console.error("Errore login:", error);

        return res.status(500).json({
            success: false,
            message: "Errore durante il login"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get("/api/dashboard", authenticateToken, async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();
        const isAdmin = ["admin", "superadmin"].includes(
            String(req.user?.role || "").toLowerCase()
        );
        const invoiceOwnerFilter = isAdmin
            ? ""
            : " AND user_owner_id = ?";
        const invoiceOwnerParams = isAdmin
            ? []
            : [req.user.id];

        const clientsResult = await conn.query(`
            SELECT COUNT(*) AS totale
            FROM clients
        `);

        const productsResult = await conn.query(`
            SELECT COUNT(*) AS totale
            FROM products
        `);

        const usersResult = await conn.query(`
            SELECT COUNT(*) AS totale
            FROM users
        `);

        const activeProductsResult = await conn.query(`
            SELECT COUNT(*) AS totale
            FROM products
            WHERE active = 1
        `);

        const inactiveProductsResult = await conn.query(`
            SELECT COUNT(*) AS totale
            FROM products
            WHERE active = 0
        `);

        const activeUsersResult = await conn.query(`
            SELECT COUNT(*) AS totale
            FROM users
            WHERE active = 1
        `);

        const inactiveUsersResult = await conn.query(`
            SELECT COUNT(*) AS totale
            FROM users
            WHERE active = 0
        `);

        const lowStockResult = await conn.query(`
            SELECT COUNT(*) AS totale
            FROM products
            WHERE quantita <= scorta_minima
              AND active = 1
        `);

        const monthlyInvoices = await conn.query(`
            SELECT
                DATE_FORMAT(invoice_date, '%Y-%m-01') AS month,
                COUNT(*) AS invoice_count,
                SUM(total_amount) AS revenue
            FROM invoices
            WHERE invoice_date >= DATE_FORMAT(
                    DATE_SUB(CURDATE(), INTERVAL 5 MONTH),
                    '%Y-%m-01'
                )
              AND invoice_date < DATE_ADD(
                    DATE_FORMAT(CURDATE(), '%Y-%m-01'),
                    INTERVAL 1 MONTH
                )
              AND status <> 'CANCELLED'
              ${invoiceOwnerFilter}
            GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
            ORDER BY month
        `, invoiceOwnerParams);

        const invoiceStatuses = await conn.query(`
            SELECT status, COUNT(*) AS invoice_count
            FROM invoices
            WHERE 1 = 1
              ${invoiceOwnerFilter}
            GROUP BY status
            ORDER BY status
        `, invoiceOwnerParams);

        const topProducts = await conn.query(`
            SELECT
                ii.product_id,
                ii.description AS name,
                SUM(ii.quantity) AS quantity
            FROM invoice_items ii
            INNER JOIN invoices i
                ON i.id = ii.invoice_id
            WHERE ii.product_id IS NOT NULL
              AND i.status IN ('ISSUED', 'PAID')
              ${isAdmin ? "" : "AND i.user_owner_id = ?"}
            GROUP BY ii.product_id, ii.description
            ORDER BY quantity DESC, name
            LIMIT 5
        `, invoiceOwnerParams);

        const topClients = await conn.query(`
            SELECT
                c.id,
                c.ragione_sociale AS name,
                SUM(i.total_amount) AS revenue
            FROM invoices i
            INNER JOIN clients c
                ON c.id = i.client_id
            WHERE i.status IN ('ISSUED', 'PAID')
              ${isAdmin ? "" : "AND i.user_owner_id = ?"}
            GROUP BY c.id, c.ragione_sociale
            ORDER BY revenue DESC, name
            LIMIT 5
        `, invoiceOwnerParams);

        return res.json({

            clients: Number(clientsResult[0].totale),

            products: Number(productsResult[0].totale),

            users: Number(usersResult[0].totale),

            activeProducts:
                Number(activeProductsResult[0].totale),

            inactiveProducts:
                Number(inactiveProductsResult[0].totale),

            activeUsers:
                Number(activeUsersResult[0].totale),

            inactiveUsers:
                Number(inactiveUsersResult[0].totale),

            lowStock:
                Number(lowStockResult[0].totale),

            charts: {
                monthlyInvoices: monthlyInvoices.map(row => ({
                    month: row.month,
                    count: Number(row.invoice_count),
                    revenue: Number(row.revenue || 0)
                })),
                invoiceStatuses: invoiceStatuses.map(row => ({
                    status: row.status,
                    count: Number(row.invoice_count)
                })),
                topProducts: topProducts.map(row => ({
                    id: Number(row.product_id),
                    name: row.name,
                    quantity: Number(row.quantity)
                })),
                topClients: topClients.map(row => ({
                    id: Number(row.id),
                    name: row.name,
                    revenue: Number(row.revenue)
                }))
            }

        });

    } catch (error) {

        console.error(
            "Errore dashboard:",
            error
        );

        return res.status(500).json({
            message:
                "Errore durante il caricamento della dashboard"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

//app.get("/api/users", async (req, res) => {
app.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                id,
                username,
                email,
                nome,
                cognome,
                role,
                level,
                active,
                last_login,
                created_at
            FROM users
            ORDER BY username
        `);

        res.json(rows);

    } catch (error) {

        console.error("Errore caricamento utenti:", error);

        res.status(500).json({
            message: "Errore durante il caricamento degli utenti"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;
    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                id,
                username,
                email,
                nome,
                cognome,
                role,
                level,
                active,
                last_login,
                created_at
            FROM users
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Utente non trovato"
            });
        }

        return res.json(rows[0]);

    } catch (error) {

        console.error("Errore caricamento utente:", error);

        return res.status(500).json({
            message: "Errore durante il caricamento dell'utente"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.post("/api/users", authenticateToken, requireAdmin, async (req, res) => {

    const {
        username,
        email,
        nome,
        cognome,
        role,
        level,
        active,
        password
    } = req.body;

    let conn;

    try {

        // Controlli minimi
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, email e password sono obbligatori"
            });
        }

        conn = await db.getConnection();

        // Controllo username/email già esistenti
        const existing = await conn.query(`
            SELECT id
            FROM users
            WHERE username = ?
               OR email = ?
            LIMIT 1
        `, [
            username,
            email
        ]);

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Username o email già utilizzati"
            });
        }

        // Cripto la password
        const passwordHash = await bcrypt.hash(
            password,
            10
        );

        // Inserisco l'utente
        const result = await conn.query(`
            INSERT INTO users
            (
                username,
                email,
                password_hash,
                nome,
                cognome,
                role,
                level,
                active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            username,
            email,
            passwordHash,
            nome || null,
            cognome || null,
            role || "user",
            Number(level) || 10,
            active === 0 ? 0 : 1
        ]);

        return res.status(201).json({
            message: "Utente creato correttamente",
            id: Number(result.insertId)
        });

    } catch (error) {

        console.error("Errore creazione utente:", error);

        return res.status(500).json({
            message: "Errore durante la creazione dell'utente"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.put("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;

    const {
        username,
        email,
        nome,
        cognome,
        role,
        level,
        active,
        password
    } = req.body;

    let conn;

    try {

        if (!username || !email) {
            return res.status(400).json({
                message: "Username e email sono obbligatori"
            });
        }

        conn = await db.getConnection();

        // Controllo che l'utente esista
        const users = await conn.query(`
            SELECT id
            FROM users
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (users.length === 0) {
            return res.status(404).json({
                message: "Utente non trovato"
            });
        }


        // Controllo che username/email non siano
        // utilizzati da UN ALTRO utente
        const existing = await conn.query(`
            SELECT id
            FROM users
            WHERE (username = ? OR email = ?)
              AND id <> ?
            LIMIT 1
        `, [
            username,
            email,
            id
        ]);

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Username o email già utilizzati"
            });
        }


        // Aggiorno i dati principali
        await conn.query(`
            UPDATE users
            SET
                username = ?,
                email = ?,
                nome = ?,
                cognome = ?,
                role = ?,
                level = ?,
                active = ?
            WHERE id = ?
        `, [
            username,
            email,
            nome || null,
            cognome || null,
            role || "user",
            Number(level) || 10,
            active === 0 ? 0 : 1,
            id
        ]);


        // Se è stata inserita una nuova password,
        // aggiorno anche la password
        if (password && password.trim() !== "") {

            const passwordHash = await bcrypt.hash(
                password,
                10
            );

            await conn.query(`
                UPDATE users
                SET password_hash = ?
                WHERE id = ?
            `, [
                passwordHash,
                id
            ]);
        }


        return res.json({
            message: "Utente modificato correttamente"
        });

    } catch (error) {

        console.error("Errore modifica utente:", error);

        return res.status(500).json({
            message: "Errore durante la modifica dell'utente"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.delete("/api/users/:id", authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;
    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                id,
                username
            FROM users
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Utente non trovato"
            });
        }

        await conn.query(`
            DELETE FROM users
            WHERE id = ?
        `, [id]);

        return res.json({
            message: "Utente eliminato correttamente"
        });

    } catch (error) {

        console.error(
            "Errore eliminazione utente:",
            error
        );

        return res.status(500).json({
            message:
                "Errore durante l'eliminazione dell'utente"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.post("/api/users/:id/copy", authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;
    let conn;

    try {

        conn = await db.getConnection();

        // Recupero utente originale
        const rows = await conn.query(`
            SELECT
                id,
                username,
                email,
                nome,
                cognome,
                role,
                level,
                active
            FROM users
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Utente non trovato"
            });
        }

        const original = rows[0];

        /*
         * Creiamo valori temporaneamente unici.
         * Dopo l'inserimento useremo l'ID per renderli
         * ancora più chiari.
         */
        const unique = Date.now();

        const temporaryUsername =
            `${original.username}_copy_${unique}`;

        const temporaryEmail =
            `copy_${unique}_${original.email}`;

        // Password temporanea
        const temporaryPassword = "ChangeMe123!";

        const passwordHash = await bcrypt.hash(
            temporaryPassword,
            10
        );

        // Inserimento copia
        const result = await conn.query(`
            INSERT INTO users
            (
                username,
                email,
                password_hash,
                nome,
                cognome,
                role,
                level,
                active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            temporaryUsername,
            temporaryEmail,
            passwordHash,
            original.nome,
            original.cognome,
            original.role,
            original.level,
            original.active
        ]);

        const newId = Number(result.insertId);

        // Username più leggibile
        const newUsername =
            `${original.username}_copy_${newId}`;

        await conn.query(`
            UPDATE users
            SET username = ?
            WHERE id = ?
        `, [
            newUsername,
            newId
        ]);

        return res.status(201).json({
            message: "Utente duplicato correttamente",
            id: newId,
            username: newUsername,
            temporaryPassword
        });

    } catch (error) {

        console.error(
            "Errore duplicazione utente:",
            error
        );

        return res.status(500).json({
            message:
                "Errore durante la duplicazione dell'utente"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});


app.get("/api/products", authenticateToken, async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                p.id,
                p.codice,
                p.nome,
                p.descrizione,
                p.category_id,
                pc.name AS categoria,
                p.prezzo,
                p.costo,
                p.aliquota_iva,
                p.quantita,
                p.scorta_minima,
                p.unita_misura,
                p.barcode,
                p.immagine,
                p.active
            FROM products p

            LEFT JOIN productCategories pc
                ON pc.id = p.category_id

            ORDER BY p.id DESC
        `);

        return res.json(rows);

    } catch (error) {

        console.error("Errore caricamento prodotti:", error);

        return res.status(500).json({
            message: "Errore durante il caricamento dei prodotti"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.post("/api/products", authenticateToken, async (req, res) => {

    const {
        nome,
        descrizione,
        category_id,
        prezzo,
        costo,
        aliquota_iva,
        quantita,
        scorta_minima,
        unita_misura,
        barcode,
        immagine,
        active
    } = req.body;

    let conn;

    try {

        if (!nome) {
            return res.status(400).json({
                message: "Il nome del prodotto è obbligatorio"
            });
        }

        conn = await db.getConnection();

        /*
         * Codice temporaneo univoco.
         * Ci serve perché codice è NOT NULL e UNIQUE,
         * ma non conosciamo ancora l'ID AUTO_INCREMENT.
         */
        const codiceProvvisorio =
            `TMP-${Date.now()}`;

        const result = await conn.query(`
            INSERT INTO products
            (
                codice,
                nome,
                descrizione,
                category_id,
                prezzo,
                costo,
                aliquota_iva,
                quantita,
                scorta_minima,
                unita_misura,
                barcode,
                immagine,
                active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            codiceProvvisorio,
            nome,
            descrizione || null,
            category_id ? Number(category_id) : null,
            Number(prezzo) || 0,
            costo !== "" ? Number(costo) : null,
            Number(aliquota_iva) || 22,
            Number(quantita) || 0,
            Number(scorta_minima) || 0,
            unita_misura || "PZ",
            barcode || null,
            immagine || null,
            Number(active) === 0 ? 0 : 1
        ]);

        /*
         * ID generato da MariaDB
         */
        const newId = Number(result.insertId);

        /*
         * Creo il codice prodotto
         *
         * 1   -> PRD001
         * 12  -> PRD012
         * 123 -> PRD123
         */
        const nuovoCodice =
            "PRD" + String(newId).padStart(3, "0");


        /*
         * Controllo che non esista già
         */
        const existing = await conn.query(`
            SELECT id
            FROM products
            WHERE codice = ?
              AND id <> ?
            LIMIT 1
        `, [
            nuovoCodice,
            newId
        ]);

        if (existing.length > 0) {

            // Elimino il record appena inserito
            await conn.query(
                "DELETE FROM products WHERE id = ?",
                [newId]
            );

            return res.status(409).json({
                message:
                    `Il codice prodotto ${nuovoCodice} esiste già`
            });
        }


        /*
         * Sostituisco il codice temporaneo
         * con quello definitivo.
         */
        await conn.query(`
            UPDATE products
            SET codice = ?
            WHERE id = ?
        `, [
            nuovoCodice,
            newId
        ]);


        return res.status(201).json({

            message:
                "Prodotto creato correttamente",

            id: newId,

            codice: nuovoCodice
        });


    } catch (error) {

        console.error(
            "Errore creazione prodotto:",
            error
        );

        return res.status(500).json({
            message:
                "Errore durante la creazione del prodotto"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get("/api/products/:id",authenticateToken, async (req, res) => {

    const id = req.params.id;
    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                p.id,
                p.codice,
                p.nome,
                p.descrizione,
                p.category_id,
                pc.name AS categoria,
                p.prezzo,
                p.costo,
                p.aliquota_iva,
                p.quantita,
                p.scorta_minima,
                p.unita_misura,
                p.barcode,
                p.immagine,
                p.active
            FROM products p

            LEFT JOIN productCategories pc
                ON pc.id = p.category_id

            WHERE p.id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Prodotto non trovato"
            });
        }

        return res.json(rows[0]);

    } catch (error) {

        console.error("Errore caricamento prodotto:", error);

        return res.status(500).json({
            message: "Errore durante il caricamento del prodotto"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get("/api/products/:id/quantity-discounts", authenticateToken, async (req, res) => {
    const productId = Number(req.params.id);
    let conn;

    if (!Number.isSafeInteger(productId) || productId < 1) {
        return res.status(400).json({
            message: "Invalid product ID"
        });
    }

    try {
        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT id, product_id, min_qty, max_qty, discount_percent
            FROM product_quantity_discounts
            WHERE product_id = ?
            ORDER BY min_qty
        `, [productId]);

        return res.json(rows);
    } catch (error) {
        console.error("Error loading product quantity discounts:", error);
        return res.status(500).json({
            message: "Error loading quantity discounts"
        });
    } finally {
        if (conn) {
            conn.release();
        }
    }
});

app.put("/api/products/:id/quantity-discounts", authenticateToken, async (req, res) => {
    const productId = Number(req.params.id);
    const discounts = req.body.discounts;
    let conn;
    let transactionStarted = false;

    if (!Number.isSafeInteger(productId) || productId < 1) {
        return res.status(400).json({
            message: "Invalid product ID"
        });
    }

    if (!Array.isArray(discounts)) {
        return res.status(400).json({
            message: "Discount tiers must be provided as an array"
        });
    }

    const normalizedDiscounts = [];

    for (const [index, discount] of discounts.entries()) {
        if (!discount || typeof discount !== "object") {
            return res.status(400).json({
                message: `Invalid quantity discount on row ${index + 1}`
            });
        }

        const minQty = Number(discount.min_qty);
        const maxQty = discount.max_qty === null ||
            discount.max_qty === undefined ||
            discount.max_qty === ""
            ? null
            : Number(discount.max_qty);
        const discountPercent = Number(discount.discount_percent);

        if (
            discount.min_qty === "" ||
            discount.min_qty === null ||
            discount.min_qty === undefined ||
            discount.discount_percent === "" ||
            discount.discount_percent === null ||
            discount.discount_percent === undefined ||
            !Number.isSafeInteger(minQty) ||
            minQty < 1 ||
            (maxQty !== null && (!Number.isSafeInteger(maxQty) || maxQty < minQty)) ||
            !Number.isFinite(discountPercent) ||
            discountPercent < 0 ||
            discountPercent > 100 ||
            Math.round(discountPercent * 100) !== discountPercent * 100
        ) {
            return res.status(400).json({
                message: `Invalid quantity discount on row ${index + 1}`
            });
        }

        normalizedDiscounts.push({
            minQty,
            maxQty,
            discountPercent
        });
    }

    normalizedDiscounts.sort((a, b) => a.minQty - b.minQty);

    for (let index = 1; index < normalizedDiscounts.length; index += 1) {
        const previous = normalizedDiscounts[index - 1];
        const current = normalizedDiscounts[index];

        if (previous.maxQty === null || current.minQty <= previous.maxQty) {
            return res.status(400).json({
                message: "Quantity discount ranges must not overlap"
            });
        }
    }

    try {
        conn = await db.getConnection();
        await conn.beginTransaction();
        transactionStarted = true;

        const products = await conn.query(
            "SELECT id FROM products WHERE id = ? LIMIT 1",
            [productId]
        );

        if (products.length === 0) {
            await conn.rollback();
            transactionStarted = false;
            return res.status(404).json({
                message: "Product not found"
            });
        }

        await conn.query(
            "DELETE FROM product_quantity_discounts WHERE product_id = ?",
            [productId]
        );

        for (const discount of normalizedDiscounts) {
            await conn.query(`
                INSERT INTO product_quantity_discounts
                    (product_id, min_qty, max_qty, discount_percent)
                VALUES (?, ?, ?, ?)
            `, [
                productId,
                discount.minQty,
                discount.maxQty,
                discount.discountPercent
            ]);
        }

        await conn.commit();
        transactionStarted = false;

        return res.json({
            message: "Quantity discounts saved successfully",
            discounts: normalizedDiscounts
        });
    } catch (error) {
        if (transactionStarted) {
            try {
                await conn.rollback();
            } catch (rollbackError) {
                console.error("Error rolling back quantity discounts:", rollbackError);
            }
        }

        console.error("Error saving product quantity discounts:", error);
        return res.status(500).json({
            message: "Error saving quantity discounts"
        });
    } finally {
        if (conn) {
            conn.release();
        }
    }
});

app.get("/api/product-quantity-discounts", authenticateToken, async (req, res) => {
    let conn;

    try {
        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT product_id, min_qty, max_qty, discount_percent
            FROM product_quantity_discounts
            ORDER BY product_id, min_qty
        `);

        return res.json(rows);
    } catch (error) {
        console.error("Error loading product quantity discounts:", error);
        return res.status(500).json({
            message: "Error loading quantity discounts"
        });
    } finally {
        if (conn) {
            conn.release();
        }
    }
});

async function loadQuantityDiscountTiers(conn, items) {
    const productIds = [...new Set(
        items
            .map(item => Number(item.product_id))
            .filter(id => Number.isSafeInteger(id) && id > 0)
    )];

    if (productIds.length === 0) {
        return new Map();
    }

    const placeholders = productIds.map(() => "?").join(", ");
    const rows = await conn.query(`
        SELECT product_id, min_qty, max_qty, discount_percent
        FROM product_quantity_discounts
        WHERE product_id IN (${placeholders})
        ORDER BY product_id, min_qty
    `, productIds);
    const tiersByProduct = new Map();

    for (const row of rows) {
        const productId = Number(row.product_id);
        const tiers = tiersByProduct.get(productId) || [];
        tiers.push(row);
        tiersByProduct.set(productId, tiers);
    }

    return tiersByProduct;
}

function getQuantityDiscountPercent(tiers, quantity) {
    const applicableTier = (tiers || []).find(tier => {
        const minQty = Number(tier.min_qty);
        const maxQty = tier.max_qty === null ? null : Number(tier.max_qty);

        return quantity >= minQty &&
            (maxQty === null || quantity <= maxQty);
    });

    return applicableTier
        ? Number(applicableTier.discount_percent)
        : 0;
}

app.put("/api/products/:id", authenticateToken,async (req, res) => {

    const id = req.params.id;

    const {
        nome,
        descrizione,
        category_id,
        prezzo,
        costo,
        aliquota_iva,
        quantita,
        scorta_minima,
        unita_misura,
        barcode,
        immagine,
        active
    } = req.body;

    let conn;

    try {

        if (!nome) {
            return res.status(400).json({
                message: "Il nome del prodotto è obbligatorio"
            });
        }

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT id
            FROM products
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Prodotto non trovato"
            });
        }

        await conn.query(`
            UPDATE products
            SET
                nome = ?,
                descrizione = ?,
                category_id = ?,
                prezzo = ?,
                costo = ?,
                aliquota_iva = ?,
                quantita = ?,
                scorta_minima = ?,
                unita_misura = ?,
                barcode = ?,
                immagine = ?,
                active = ?
            WHERE id = ?
        `, [
            nome,
            descrizione || null,
            category_id ? Number(category_id) : null,
            Number(prezzo) || 0,
            costo !== "" ? Number(costo) : null,
            Number(aliquota_iva) || 22,
            Number(quantita) || 0,
            Number(scorta_minima) || 0,
            unita_misura || "PZ",
            barcode || null,
            immagine || null,
            Number(active) === 0 ? 0 : 1,
            id
        ]);

        return res.json({
            message: "Prodotto modificato correttamente"
        });

    } catch (error) {

        console.error("Errore modifica prodotto:", error);

        return res.status(500).json({
            message: "Errore durante la modifica del prodotto"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.post(
    "/api/products/upload", authenticateToken,
    uploadProduct.single("image"),
    (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                message: "Nessuna immagine ricevuta"
            });
        }

        return res.json({
            path: `/uploads/products/${req.file.filename}`
        });
    }
);

app.delete("/api/products/:id",authenticateToken, requireAdmin, async (req, res) => {

    const id = req.params.id;
    let conn;

    try {

        conn = await db.getConnection();

        // Controllo che il prodotto esista
        const rows = await conn.query(`
            SELECT id, nome
            FROM products
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Prodotto non trovato"
            });
        }

        await conn.query(`
            DELETE FROM products
            WHERE id = ?
        `, [id]);

        return res.json({
            message: "Prodotto eliminato correttamente"
        });

    } catch (error) {

        console.error(
            "Errore eliminazione prodotto:",
            error
        );

        return res.status(500).json({
            message:
                "Errore durante l'eliminazione del prodotto"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.post("/api/products/:id/copy", authenticateToken,async (req, res) => {

    const id = req.params.id;
    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT *
            FROM products
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Prodotto non trovato"
            });
        }

        const product = rows[0];

        const codiceProvvisorio =
            `TMP-${Date.now()}`;

        const result = await conn.query(`
            INSERT INTO products
            (
                codice,
                nome,
                descrizione,
                category_id,
                prezzo,
                costo,
                aliquota_iva,
                quantita,
                scorta_minima,
                unita_misura,
                barcode,
                immagine,
                active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            codiceProvvisorio,
            product.nome,
            product.descrizione,
            product.category_id,
            product.prezzo,
            product.costo,
            product.aliquota_iva,
            product.quantita,
            product.scorta_minima,
            product.unita_misura,
            null, // barcode non viene copiato
            product.immagine,
            product.active
        ]);

        const newId = Number(result.insertId);

        const nuovoCodice =
            "PRD" + String(newId).padStart(3, "0");

        await conn.query(`
            UPDATE products
            SET codice = ?
            WHERE id = ?
        `, [
            nuovoCodice,
            newId
        ]);

        return res.status(201).json({
            message: "Prodotto duplicato correttamente",
            id: newId,
            codice: nuovoCodice
        });

    } catch (error) {

        console.error(
            "Errore duplicazione prodotto:",
            error
        );

        return res.status(500).json({
            message:
                "Errore durante la duplicazione del prodotto"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});


app.get('/api/data', async (req, res) => {

    let conn;

    try {
        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                c.id,
                c.codice_cliente,
                c.ragione_sociale,
                c.partita_iva,
                c.codice_fiscale,
                c.indirizzo,
                c.city AS citta,
                c.province AS provincia,
                c.zip_code AS cap,
                country.nome AS country_name,
                c.logo_path

            FROM clients c
            LEFT JOIN countries country
                ON country.id = c.country_id

            ORDER BY c.ragione_sociale
        `);

        res.json(rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Errore durante la lettura dei clienti'
        });

    } finally {

        if (conn) {
            conn.release();
        }

    }

});

app.get('/api/countries', authenticateToken, async (req, res) => {
    let conn;

    try {
        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT id, nome, codice_iso2, codice_iso3
            FROM countries
            ORDER BY nome
        `);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Error while loading countries'
        });
    } finally {
        if (conn) {
            conn.release();
        }
    }
});

app.post(
    '/api/clients',authenticateToken,
    upload.single('logo'),
    async (req, res) => {

        console.log('BODY:', req.body);
        console.log('FILE:', req.file);

        let conn;

        try {

            const {
                ragione_sociale,
                partita_iva,
                codice_fiscale,
                indirizzo,
                city,
                province,
                zip_code,
                country_id,
                city_ship,
                province_ship,
                zip_code_ship,
                indirizzo_ship,
                country_id_ship,
                contact,
                contact_phone,
                conctact_mail
            } = req.body;

            const logo_path = req.file
                ? req.file.filename
                : null;

            conn = await db.getConnection();

            // Codice provvisorio univoco.
            // Serve perché codice_cliente è NOT NULL / UNIQUE.
            const temporaryCode =
                `TMP-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 8)}`;

            // Primo inserimento con codice temporaneo
            const result = await conn.query(`
                INSERT INTO clients
                (
                    codice_cliente,
                    ragione_sociale,
                    partita_iva,
                    codice_fiscale,
                    indirizzo,
                    city,
                    province,
                    zip_code,
                    country_id,
                    city_ship,
                    province_ship,
                    zip_code_ship,
                    indirizzo_ship,
                    country_id_ship,
                    contact,
                    contact_phone,
                    conctact_mail,
                    logo_path
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                temporaryCode,
                ragione_sociale,
                partita_iva || null,
                codice_fiscale || null,
                indirizzo || null,
                city || null,
                province || null,
                zip_code || null,
                country_id || null,
                city_ship || null,
                province_ship || null,
                zip_code_ship || null,
                indirizzo_ship || null,
                country_id_ship || null,
                contact || null,
                contact_phone || null,
                conctact_mail || null,
                logo_path
            ]);

            // ID generato da MariaDB
            const newId = Number(result.insertId);

            // Generazione codice definitivo
            // 1   -> CLI001
            // 12  -> CLI012
            // 123 -> CLI123
            const codiceCliente =
                `CLI${String(newId).padStart(3, '0')}`;

            // Aggiorno il record con il codice definitivo
            await conn.query(`
                UPDATE clients
                SET codice_cliente = ?
                WHERE id = ?
            `, [
                codiceCliente,
                newId
            ]);

            return res.status(201).json({
                success: true,
                message: 'Cliente inserito correttamente',
                id: newId,
                codice_cliente: codiceCliente
            });

        } catch (err) {

            console.error(
                'Errore inserimento cliente:',
                err
            );

            // Errore duplicato
            if (
                err.errno === 1062 ||
                err.code === 'ER_DUP_ENTRY'
            ) {
                return res.status(409).json({
                    success: false,
                    error: 'Codice cliente duplicato'
                });
            }

            return res.status(500).json({
                success: false,
                error: err.message
            });

        } finally {

            if (conn) {
                conn.release();
            }

        }
    }
);


app.get('/api/regions', async (req, res) => {

    let conn;

    try {
        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT id, name
            FROM regions
            ORDER BY name
        `);

        res.json(rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Errore caricamento regioni'
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get("/api/provinces/all", async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                p.id,
                p.region_id,
                p.code,
                p.name,
                r.name AS region_name
            FROM provinces p

            LEFT JOIN regions r
                ON r.id = p.region_id

            ORDER BY
                r.name,
                p.name
        `);

        return res.json(rows);

    } catch (error) {

        console.error(
            "Errore caricamento province:",
            error
        );

        return res.status(500).json({
            message: "Errore durante il caricamento delle province"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get("/api/regions", async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                id,
                name
            FROM regions
            ORDER BY name
        `);

        return res.json(rows);

    } catch (error) {

        console.error(
            "Errore caricamento regioni:",
            error
        );

        return res.status(500).json({
            message: "Errore durante il caricamento delle regioni"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get('/api/provinces/:regionId', async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT id, name
            FROM provinces
            WHERE region_id = ?
            ORDER BY name
        `, [
            req.params.regionId
        ]);

        res.json(rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Errore caricamento province'
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get("/api/provinces", async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                id,
                name
            FROM provinces
            ORDER BY name
        `);

        return res.json(rows);

    } catch (error) {

        console.error(
            "Errore caricamento province:",
            error
        );

        return res.status(500).json({
            message: "Errore durante il caricamento delle province"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.post("/api/provinces", async (req, res) => {

    const { name, code, region_id } = req.body;

    let conn;

    try {

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Il nome della provincia è obbligatorio"
            });
        }

        if (!code || !code.trim()) {
            return res.status(400).json({
                message: "La sigla della provincia è obbligatoria"
            });
        }

        if (!region_id) {
            return res.status(400).json({
                message: "La regione è obbligatoria"
            });
        }

        conn = await db.getConnection();


        // Controllo provincia già esistente
        const existing = await conn.query(`
            SELECT id
            FROM provinces
            WHERE LOWER(name) = LOWER(?)
               OR UPPER(code) = UPPER(?)
            LIMIT 1
        `, [
            name.trim(),
            code.trim()
        ]);


        if (existing.length > 0) {
            return res.status(409).json({
                message: "Provincia o sigla già esistente"
            });
        }


        const result = await conn.query(`
            INSERT INTO provinces (
                region_id,
                code,
                name
            )
            VALUES (?, ?, ?)
        `, [
            Number(region_id),
            code.trim().toUpperCase(),
            name.trim()
        ]);


        return res.status(201).json({
            message: "Provincia creata correttamente",
            id: Number(result.insertId)
        });

    } catch (error) {

        console.error(
            "Errore creazione provincia:",
            error
        );

        return res.status(500).json({
            message: "Errore durante la creazione della provincia"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.put("/api/provinces/:id", async (req, res) => {

    const id = req.params.id;
    const { name, code, region_id } = req.body;

    let conn;

    try {

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Il nome della provincia è obbligatorio"
            });
        }

        if (!code || !code.trim()) {
            return res.status(400).json({
                message: "La sigla della provincia è obbligatoria"
            });
        }

        if (!region_id) {
            return res.status(400).json({
                message: "La regione è obbligatoria"
            });
        }

        conn = await db.getConnection();


        // Verifica che la provincia esista
        const rows = await conn.query(`
            SELECT id
            FROM provinces
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Provincia non trovata"
            });
        }


        // Controlla nome o sigla duplicati,
        // escludendo la provincia che stiamo modificando
        const existing = await conn.query(`
            SELECT id
            FROM provinces
            WHERE (
                LOWER(name) = LOWER(?)
                OR UPPER(code) = UPPER(?)
            )
            AND id <> ?
            LIMIT 1
        `, [
            name.trim(),
            code.trim(),
            id
        ]);

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Provincia o sigla già esistente"
            });
        }


        await conn.query(`
            UPDATE provinces
            SET
                region_id = ?,
                code = ?,
                name = ?
            WHERE id = ?
        `, [
            Number(region_id),
            code.trim().toUpperCase(),
            name.trim(),
            id
        ]);


        return res.json({
            message: "Provincia modificata correttamente"
        });

    } catch (error) {

        console.error(
            "Errore modifica provincia:",
            error
        );

        return res.status(500).json({
            message: "Errore durante la modifica della provincia"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.post("/api/cities", async (req, res) => {

    const { name, province_id } = req.body;

    let conn;

    try {

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Il nome della città è obbligatorio"
            });
        }

        if (!province_id) {
            return res.status(400).json({
                message: "La provincia è obbligatoria"
            });
        }

        conn = await db.getConnection();


        // Controllo duplicato nella stessa provincia
        const existing = await conn.query(`
            SELECT id
            FROM cities
            WHERE LOWER(name) = LOWER(?)
              AND province_id = ?
            LIMIT 1
        `, [
            name.trim(),
            Number(province_id)
        ]);


        if (existing.length > 0) {
            return res.status(409).json({
                message: "Questa città esiste già nella provincia selezionata"
            });
        }


        const result = await conn.query(`
            INSERT INTO cities (
                province_id,
                name
            )
            VALUES (?, ?)
        `, [
            Number(province_id),
            name.trim()
        ]);


        return res.status(201).json({
            message: "Città creata correttamente",
            id: Number(result.insertId)
        });

    } catch (error) {

        console.error(
            "Errore creazione città:",
            error
        );

        return res.status(500).json({
            message: "Errore durante la creazione della città"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});


app.get("/api/cities/all", async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                c.id,
                c.name,
                c.province_id,
                p.name AS province_name
            FROM cities c

            LEFT JOIN provinces p
                ON p.id = c.province_id

            ORDER BY
                p.name,
                c.name
        `);

        return res.json(rows);

    } catch (error) {

        console.error(
            "Errore caricamento città:",
            error
        );

        return res.status(500).json({
            message: "Errore durante il caricamento delle città"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get('/api/cities/:provinceId', async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT id, name
            FROM cities
            WHERE province_id = ?
            ORDER BY name
        `, [
            req.params.provinceId
        ]);

        res.json(rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Errore caricamento città'
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.put("/api/cities/:id", async (req, res) => {

    const id = req.params.id;
    const { name, province_id } = req.body;

    let conn;

    try {

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Il nome della città è obbligatorio"
            });
        }

        if (!province_id) {
            return res.status(400).json({
                message: "La provincia è obbligatoria"
            });
        }


        conn = await db.getConnection();


        // Controlliamo che la città esista
        const rows = await conn.query(`
            SELECT id
            FROM cities
            WHERE id = ?
            LIMIT 1
        `, [id]);


        if (rows.length === 0) {
            return res.status(404).json({
                message: "Città non trovata"
            });
        }


        // Controllo duplicati, escludendo la città corrente
        const existing = await conn.query(`
            SELECT id
            FROM cities
            WHERE LOWER(name) = LOWER(?)
              AND province_id = ?
              AND id <> ?
            LIMIT 1
        `, [
            name.trim(),
            Number(province_id),
            id
        ]);


        if (existing.length > 0) {
            return res.status(409).json({
                message: "Questa città esiste già nella provincia selezionata"
            });
        }


        await conn.query(`
            UPDATE cities
            SET
                name = ?,
                province_id = ?
            WHERE id = ?
        `, [
            name.trim(),
            Number(province_id),
            id
        ]);


        return res.json({
            message: "Città modificata correttamente"
        });


    } catch (error) {

        console.error(
            "Errore modifica città:",
            error
        );

        return res.status(500).json({
            message: "Errore durante la modifica della città"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});


app.get("/api/postal-codes/all", async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                pc.id,
                pc.cap,
                pc.city_id,

                c.name AS city_name,

                p.id AS province_id,
                p.code AS province_code,
                p.name AS province_name,

                r.id AS region_id,
                r.name AS region_name

            FROM postal_codes pc

            LEFT JOIN cities c
                ON c.id = pc.city_id

            LEFT JOIN provinces p
                ON p.id = c.province_id

            LEFT JOIN regions r
                ON r.id = p.region_id

            ORDER BY
                r.name,
                p.name,
                c.name,
                pc.cap
        `);

        return res.json(rows);

    } catch (error) {

        console.error(
            "Errore caricamento CAP:",
            error
        );

        return res.status(500).json({
            message: "Errore durante il caricamento dei CAP"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});


app.get('/api/postal-codes/:cityId', async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT id, cap
            FROM postal_codes
            WHERE city_id = ?
            ORDER BY cap
        `, [
            req.params.cityId
        ]);

        res.json(rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Errore caricamento CAP'
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.post("/api/postal-codes", async (req, res) => {

    const { cap, city_id } = req.body;

    let conn;

    try {

        // Controllo CAP
        if (!cap || !/^\d{5}$/.test(cap.trim())) {
            return res.status(400).json({
                message: "Il CAP deve essere composto da 5 cifre"
            });
        }

        // Controllo città
        if (!city_id) {
            return res.status(400).json({
                message: "La città è obbligatoria"
            });
        }

        conn = await db.getConnection();


        // Controllo che la città esista
        const cityRows = await conn.query(`
            SELECT id
            FROM cities
            WHERE id = ?
            LIMIT 1
        `, [
            Number(city_id)
        ]);

        if (cityRows.length === 0) {
            return res.status(400).json({
                message: "La città selezionata non esiste"
            });
        }


        // Controllo duplicato CAP + città
        const existing = await conn.query(`
            SELECT id
            FROM postal_codes
            WHERE cap = ?
              AND city_id = ?
            LIMIT 1
        `, [
            cap.trim(),
            Number(city_id)
        ]);

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Questo CAP è già associato alla città selezionata"
            });
        }


        // Inserimento
        const result = await conn.query(`
            INSERT INTO postal_codes (
                city_id,
                cap
            )
            VALUES (?, ?)
        `, [
            Number(city_id),
            cap.trim()
        ]);


        return res.status(201).json({
            message: "CAP creato correttamente",
            id: Number(result.insertId)
        });

    } catch (error) {

        console.error(
            "Errore creazione CAP:",
            error
        );

        return res.status(500).json({
            message: "Errore durante la creazione del CAP"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.put("/api/postal-codes/:id", async (req, res) => {

    const id = req.params.id;
    const { cap, city_id } = req.body;

    let conn;

    try {

        if (!cap || !/^\d{5}$/.test(cap.trim())) {
            return res.status(400).json({
                message: "Il CAP deve essere composto da 5 cifre"
            });
        }

        if (!city_id) {
            return res.status(400).json({
                message: "La città è obbligatoria"
            });
        }

        conn = await db.getConnection();


        // Controllo che il CAP esista
        const rows = await conn.query(`
            SELECT id
            FROM postal_codes
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "CAP non trovato"
            });
        }


        // Controllo che la città esista
        const cityRows = await conn.query(`
            SELECT id
            FROM cities
            WHERE id = ?
            LIMIT 1
        `, [Number(city_id)]);

        if (cityRows.length === 0) {
            return res.status(400).json({
                message: "La città selezionata non esiste"
            });
        }


        // Controllo duplicato CAP + città,
        // escludendo il record corrente
        const existing = await conn.query(`
            SELECT id
            FROM postal_codes
            WHERE cap = ?
              AND city_id = ?
              AND id <> ?
            LIMIT 1
        `, [
            cap.trim(),
            Number(city_id),
            id
        ]);

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Questo CAP è già associato alla città selezionata"
            });
        }


        await conn.query(`
            UPDATE postal_codes
            SET
                cap = ?,
                city_id = ?
            WHERE id = ?
        `, [
            cap.trim(),
            Number(city_id),
            id
        ]);


        return res.json({
            message: "CAP modificato correttamente"
        });

    } catch (error) {

        console.error(
            "Errore modifica CAP:",
            error
        );

        return res.status(500).json({
            message: "Errore durante la modifica del CAP"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get('/api/clients/:id', authenticateToken, async (req, res) => {
    //console.log("ID CLIENTE RICEVUTO:", req.params.id);
    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                c.id,
                c.codice_cliente,
                c.ragione_sociale,
                c.partita_iva,
                c.codice_fiscale,
                c.indirizzo,
                c.city,
                c.province,
                c.zip_code,
                c.country_id,
                c.city_ship,
                c.province_ship,
                c.zip_code_ship,
                c.indirizzo_ship,
                c.country_id_ship,
                c.contact,
                c.contact_phone,
                c.conctact_mail,
                c.logo_path
            FROM clients c
            WHERE c.id = ?
        `, [
            req.params.id
        ]);

        if (rows.length === 0) {

            return res.status(404).json({
                error: 'Cliente non trovato'
            });

        }

        res.json(rows[0]);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    } finally {

        if (conn) {
            conn.release();
        }

    }

});

app.put(
    '/api/clients/:id', authenticateToken,
    upload.single('logo'),
    async (req, res) => {

        let conn;

        try {

            const {
                codice_cliente,
                ragione_sociale,
                partita_iva,
                codice_fiscale,
                indirizzo,
                city,
                province,
                zip_code,
                country_id,
                city_ship,
                province_ship,
                zip_code_ship,
                indirizzo_ship,
                country_id_ship,
                contact,
                contact_phone,
                conctact_mail
            } = req.body;

            conn = await db.getConnection();


            // Recupero il logo attualmente salvato
            const rows = await conn.query(`
                SELECT logo_path
                FROM clients
                WHERE id = ?
            `, [
                req.params.id
            ]);


            if (rows.length === 0) {

                return res.status(404).json({
                    success: false,
                    error: 'Cliente non trovato'
                });
            }


            // Di default mantengo il vecchio logo
            let logo_path = rows[0].logo_path;


            // Se è stato caricato un nuovo logo,
            // uso il nome del nuovo file
            if (req.file) {
                logo_path = req.file.filename;
            }


            const result = await conn.query(`
                UPDATE clients

                SET
                    codice_cliente = ?,
                    ragione_sociale = ?,
                    partita_iva = ?,
                    codice_fiscale = ?,
                    indirizzo = ?,
                    city = ?,
                    province = ?,
                    zip_code = ?,
                    country_id = ?,
                    city_ship = ?,
                    province_ship = ?,
                    zip_code_ship = ?,
                    indirizzo_ship = ?,
                    country_id_ship = ?,
                    contact = ?,
                    contact_phone = ?,
                    conctact_mail = ?,
                    logo_path = ?

                WHERE id = ?
            `, [
                codice_cliente,
                ragione_sociale,
                partita_iva || null,
                codice_fiscale || null,
                indirizzo,
                city || null,
                province || null,
                zip_code || null,
                country_id || null,
                city_ship || null,
                province_ship || null,
                zip_code_ship || null,
                indirizzo_ship || null,
                country_id_ship || null,
                contact || null,
                contact_phone || null,
                conctact_mail || null,
                logo_path,
                req.params.id
            ]);


            res.json({
                success: true,
                message: 'Cliente modificato correttamente'
            });


        } catch (err) {

            console.error(err);

            if (
                err.errno === 1062 ||
                err.code === 'ER_DUP_ENTRY'
            ) {

                return res.status(409).json({
                    success: false,
                    field: 'codice_cliente',
                    error: 'Esiste già un cliente con questo codice'
                });

            }

            res.status(500).json({
                success: false,
                error: err.message
            });
            
        } finally {


            if (conn) {
                conn.release();
            }

        }

    }
);


app.delete('/api/clients/:id', authenticateToken, requireAdmin, async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const result = await conn.query(`
            DELETE FROM clients
            WHERE id = ?
        `, [
            req.params.id
        ]);

        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                error: 'Cliente non trovato'
            });

        }

        res.json({
            success: true,
            message: 'Cliente eliminato correttamente'
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {

        if (conn) {
            conn.release();
        }

    }

});

app.post("/api/clients/:id/copy", authenticateToken, async (req, res) => {

    const id = req.params.id;
    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(
            "SELECT * FROM clients WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Cliente non trovato"
            });
        }

        const client = rows[0];

        const codiceProvvisorio = `TMP-${Date.now()}`;

        const result = await conn.query(`
            INSERT INTO clients
            (
                codice_cliente,
                ragione_sociale,
                partita_iva,
                codice_fiscale,
                indirizzo,
                city,
                province,
                zip_code,
                country_id,
                city_ship,
                province_ship,
                zip_code_ship,
                indirizzo_ship,
                country_id_ship,
                contact,
                contact_phone,
                conctact_mail,
                logo_path
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            codiceProvvisorio,
            client.ragione_sociale,
            client.partita_iva,
            client.codice_fiscale,
            client.indirizzo,
            client.city,
            client.province,
            client.zip_code,
            client.country_id,
            client.city_ship,
            client.province_ship,
            client.zip_code_ship,
            client.indirizzo_ship,
            client.country_id_ship,
            client.contact,
            client.contact_phone,
            client.conctact_mail,
            client.logo_path
        ]);

        const newId = Number(result.insertId);

        const nuovoCodice =
            "CLI" + String(newId).padStart(3, "0");

        await conn.query(
            "UPDATE clients SET codice_cliente = ? WHERE id = ?",
            [nuovoCodice, newId]
        );

        return res.status(201).json({
            message: "Cliente duplicato correttamente",
            id: newId,
            codice_cliente: nuovoCodice
        });

    } catch (error) {

        console.error("Errore copia cliente:", error);

        return res.status(500).json({
            message: "Errore durante la copia del cliente"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});


app.get("/api/product-categories", async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                id,
                name
            FROM productCategories
            WHERE active = 1
            ORDER BY sort_order, name
        `);

        return res.json(rows);

    } catch (error) {

        console.error(
            "Errore caricamento categorie:",
            error
        );

        return res.status(500).json({
            message: "Errore durante il caricamento delle categorie"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.get("/api/product-categories/all", async (req, res) => {

    let conn;

    try {

        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                id,
                name,
                description,
                active,
                sort_order
            FROM productCategories
            ORDER BY sort_order, name
        `);

        return res.json(rows);

    } catch (error) {

        console.error(
            "Errore caricamento categorie:",
            error
        );

        return res.status(500).json({
            message: "Errore durante il caricamento delle categorie"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.post("/api/product-categories", async (req, res) => {

    const {
        name,
        description,
        sort_order,
        active
    } = req.body;

    let conn;

    try {

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Il nome della categoria è obbligatorio"
            });
        }

        conn = await db.getConnection();

        const existing = await conn.query(`
            SELECT id
            FROM productCategories
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
        `, [name.trim()]);

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Categoria già esistente"
            });
        }

        const result = await conn.query(`
            INSERT INTO productCategories
            (
                name,
                description,
                sort_order,
                active
            )
            VALUES (?, ?, ?, ?)
        `, [
            name.trim(),
            description?.trim() || null,
            Number(sort_order) || 0,
            Number(active) === 0 ? 0 : 1
        ]);

        return res.status(201).json({
            message: "Categoria creata correttamente",
            id: Number(result.insertId)
        });

    } catch (error) {

        console.error("Errore creazione categoria:", error);

        return res.status(500).json({
            message: "Errore durante la creazione della categoria"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

app.put("/api/product-categories/:id", async (req, res) => {

    const id = req.params.id;

    const {
        name,
        description,
        sort_order,
        active
    } = req.body;

    let conn;

    try {

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Il nome della categoria è obbligatorio"
            });
        }

        conn = await db.getConnection();

        // Controllo che la categoria esista
        const rows = await conn.query(`
            SELECT id
            FROM productCategories
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Categoria non trovata"
            });
        }


        // Controllo eventuale nome duplicato
        const existing = await conn.query(`
            SELECT id
            FROM productCategories
            WHERE LOWER(name) = LOWER(?)
              AND id <> ?
            LIMIT 1
        `, [
            name.trim(),
            id
        ]);

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Esiste già una categoria con questo nome"
            });
        }


        // Aggiornamento
        await conn.query(`
            UPDATE productCategories
            SET
                name = ?,
                description = ?,
                sort_order = ?,
                active = ?
            WHERE id = ?
        `, [
            name.trim(),
            description?.trim() || null,
            Number(sort_order) || 0,
            Number(active) === 0 ? 0 : 1,
            id
        ]);


        return res.json({
            message: "Categoria modificata correttamente"
        });

    } catch (error) {

        console.error(
            "Errore modifica categoria:",
            error
        );

        return res.status(500).json({
            message: "Errore durante la modifica della categoria"
        });

    } finally {

        if (conn) {
            conn.release();
        }
    }
});

/*
app.get("/api/payment-methods/all", authenticateToken, requireAdmin,async (req, res) => {
    let conn;

    try {
        conn = await db.getConnection();

        const rows = await conn.query(`
            SELECT
                id,
                code,
                name,
                active,
                sort_order
            FROM payment_methods
            ORDER BY sort_order, name
        `);

        return res.json(rows);

    } catch (error) {
        console.error("Errore caricamento metodi di pagamento:", error);

        return res.status(500).json({
            message: "Errore durante il caricamento dei metodi di pagamento"
        });

    } finally {
        if (conn) conn.release();
    }
});
*/
app.get("/api/payment-methods", authenticateToken, async (req, res) => {

        let conn;

        try {

            conn = await db.getConnection();

            const rows = await conn.query(`
                SELECT
                    id,
                    code,
                    name,
                    active,
                    sort_order
                FROM payment_methods
                ORDER BY sort_order, name
            `);

            res.json(rows);

        } catch (error) {

            console.error(
                "Errore caricamento metodi di pagamento:",
                error
            );

            res.status(500).json({
                message:
                    "Errore durante il caricamento dei metodi di pagamento"
            });

        } finally {

            if (conn) {
                conn.release();
            }

        }
    }
);

app.post(
    "/api/payment-methods", authenticateToken, requireAdmin, async (req, res) => {

        const {
            code,
            name,
            active,
            sort_order
        } = req.body;

        let conn;

        try {

            if (!code || !name) {
                return res.status(400).json({
                    message: "Codice e descrizione sono obbligatori"
                });
            }

            conn = await db.getConnection();

            // Controlliamo che il codice non esista già
            const existing = await conn.query(`
                SELECT id
                FROM payment_methods
                WHERE code = ?
                LIMIT 1
            `, [code.trim().toUpperCase()]);

            if (existing.length > 0) {
                return res.status(409).json({
                    message: "Esiste già un metodo di pagamento con questo codice"
                });
            }

            const result = await conn.query(`
                INSERT INTO payment_methods
                (
                    code,
                    name,
                    active,
                    sort_order
                )
                VALUES (?, ?, ?, ?)
            `, [
                code.trim().toUpperCase(),
                name.trim(),
                active === false || active === 0 ? 0 : 1,
                Number(sort_order) || 0
            ]);

            return res.status(201).json({
                message: "Metodo di pagamento creato correttamente",
                id: Number(result.insertId)
            });

        } catch (error) {

            console.error(
                "Errore creazione metodo di pagamento:",
                error
            );

            return res.status(500).json({
                message: "Errore durante la creazione del metodo di pagamento"
            });

        } finally {

            if (conn) {
                conn.release();
            }
        }
    }
);

app.get("/api/payment-methods/:id", authenticateToken, requireAdmin, async (req, res) => {

        const { id } = req.params;

        let conn;

        try {

            conn = await db.getConnection();

            const rows = await conn.query(`
                SELECT
                    id,
                    code,
                    name,
                    active,
                    sort_order
                FROM payment_methods
                WHERE id = ?
                LIMIT 1
            `, [id]);

            if (rows.length === 0) {
                return res.status(404).json({
                    message: "Metodo di pagamento non trovato"
                });
            }

            return res.json(rows[0]);

        } catch (error) {

            console.error(
                "Errore caricamento metodo di pagamento:",
                error
            );

            return res.status(500).json({
                message:
                    "Errore durante il caricamento del metodo di pagamento"
            });

        } finally {

            if (conn) {
                conn.release();
            }
        }
    }
);

app.put(
    "/api/payment-methods/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        const { id } = req.params;

        const {
            code,
            name,
            active,
            sort_order
        } = req.body;

        let conn;

        try {

            if (!code || !name) {
                return res.status(400).json({
                    message: "Codice e descrizione sono obbligatori"
                });
            }

            conn = await db.getConnection();

            // Verifica che il metodo esista
            const existingPayment = await conn.query(`
                SELECT id
                FROM payment_methods
                WHERE id = ?
                LIMIT 1
            `, [id]);

            if (existingPayment.length === 0) {
                return res.status(404).json({
                    message: "Metodo di pagamento non trovato"
                });
            }

            // Verifica che il codice non sia usato da un altro record
            const duplicateCode = await conn.query(`
                SELECT id
                FROM payment_methods
                WHERE code = ?
                  AND id <> ?
                LIMIT 1
            `, [
                code.trim().toUpperCase(),
                id
            ]);

            if (duplicateCode.length > 0) {
                return res.status(409).json({
                    message:
                        "Esiste già un metodo di pagamento con questo codice"
                });
            }

            await conn.query(`
                UPDATE payment_methods
                SET
                    code = ?,
                    name = ?,
                    active = ?,
                    sort_order = ?
                WHERE id = ?
            `, [
                code.trim().toUpperCase(),
                name.trim(),
                active === false || active === 0 ? 0 : 1,
                Number(sort_order) || 0,
                id
            ]);

            return res.json({
                message:
                    "Metodo di pagamento modificato correttamente"
            });

        } catch (error) {

            console.error(
                "Errore modifica metodo di pagamento:",
                error
            );

            return res.status(500).json({
                message:
                    "Errore durante la modifica del metodo di pagamento"
            });

        } finally {

            if (conn) {
                conn.release();
            }
        }
    }
);

app.delete(
    "/api/payment-methods/:id", authenticateToken, requireAdmin, async (req, res) => {

        const { id } = req.params;

        let conn;

        try {

            conn = await db.getConnection();

            const existing = await conn.query(`
                SELECT id, code, name
                FROM payment_methods
                WHERE id = ?
                LIMIT 1
            `, [id]);

            if (existing.length === 0) {
                return res.status(404).json({
                    message: "Metodo di pagamento non trovato"
                });
            }

            await conn.query(`
                DELETE FROM payment_methods
                WHERE id = ?
            `, [id]);

            return res.json({
                message: "Metodo di pagamento eliminato correttamente"
            });

        } catch (error) {

            console.error(
                "Errore eliminazione metodo di pagamento:",
                error
            );

            return res.status(500).json({
                message:
                    "Errore durante l'eliminazione del metodo di pagamento"
            });

        } finally {

            if (conn) {
                conn.release();
            }
        }
    }
);

app.get("/api/invoices",authenticateToken, async (req, res) => {

        let conn;

        try {

            conn = await db.getConnection();

            const isAdmin = ["admin", "superadmin"].includes(
                String(req.user?.role || "").toLowerCase()
            );
            const ownerFilter = isAdmin
                ? ""
                : "WHERE i.user_owner_id = ?";
            const ownerParams = isAdmin ? [] : [req.user.id];

            const rows = await conn.query(`
                SELECT
                    i.id,
                    i.invoice_number,
                    i.invoice_date,
                    i.payment_due_date,
                    i.document_type,
                    i.client_id,
                    i.user_owner_id,

                    c.codice_cliente,
                    c.ragione_sociale,
                    CONCAT_WS(' ', NULLIF(u.nome, ''), NULLIF(u.cognome, '')) AS owner_name,
                    u.username AS owner_username,

                    i.payment_method_id,
                    pm.name AS payment_method,

                    i.taxable_amount,
                    i.vat_amount,
                    i.total_amount,

                    i.status,
                    s.name AS status_name,

                    i.notes,
                    i.created_at,
                    i.updated_at

                FROM invoices i

                INNER JOIN clients c
                    ON c.id = i.client_id

                LEFT JOIN users u
                    ON u.id = i.user_owner_id

                LEFT JOIN payment_methods pm
                    ON pm.id = i.payment_method_id

                LEFT JOIN invoicestatuses s
                    ON s.code = i.status

                ${ownerFilter}
                ORDER BY
                    i.invoice_date DESC,
                    i.id DESC
            `, ownerParams);

            return res.json(rows);

        } catch (error) {

            console.error(
                "Errore caricamento fatture:",
                error
            );

            return res.status(500).json({
                message:
                    "Errore durante il caricamento delle fatture"
            });

        } finally {

            if (conn) {
                conn.release();
            }
        }
    }
);

app.post("/api/invoices", authenticateToken, async (req, res) => {

        const {
            invoice_number,
            invoice_date,
            payment_due_date,
            payment_method_id,
            document_type,
            client_id,
            status,
            notes,
            items
        } = req.body;

        let conn;
        let transactionStarted = false;

        try {

            // -----------------------------
            // VALIDAZIONE
            // -----------------------------

            // if (!invoice_number) {
            //     return res.status(400).json({
            //         message: "Numero fattura obbligatorio"
            //     });
            // }

            if (!invoice_date) {
                return res.status(400).json({
                    message: "Data fattura obbligatoria"
                });
            }

            if (!client_id) {
                return res.status(400).json({
                    message: "Cliente obbligatorio"
                });
            }

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    message: "La fattura deve contenere almeno una riga"
                });
            }


            // -----------------------------
            // CALCOLO RIGHE
            // -----------------------------

            let taxableAmount = 0;
            let vatAmount = 0;
            let totalAmount = 0;

            conn = await db.getConnection();
            const discountTiersByProduct =
                await loadQuantityDiscountTiers(conn, items);

            const calculatedItems = items.map(
                (item, index) => {

                    const quantity =
                        Number(item.quantity);

                    const unitPrice =
                        Number(item.unit_price);

                    const vatRate =
                        Number(item.vat_rate);

                    const productId = item.product_id
                        ? Number(item.product_id)
                        : null;

                    if (
                        !Number.isSafeInteger(quantity) ||
                        quantity < 1 ||
                        !Number.isFinite(unitPrice) ||
                        unitPrice < 0 ||
                        !Number.isFinite(vatRate) ||
                        vatRate < 0
                    ) {
                        const validationError = new Error(
                            `Invalid values on invoice row ${index + 1}`
                        );
                        validationError.status = 400;
                        throw validationError;
                    }

                    const discountPercent = getQuantityDiscountPercent(
                        discountTiersByProduct.get(productId),
                        quantity
                    );

                    const grossTaxable =
                        Math.round(quantity * unitPrice * 100) / 100;

                    const discountAmount =
                        Math.round(grossTaxable * discountPercent) / 100;

                    const taxable = grossTaxable - discountAmount;

                    const vat =
                        Math.round(
                            taxable *
                            vatRate /
                            100 *
                            100
                        ) / 100;

                    const total =
                        Math.round(
                            (taxable + vat) * 100
                        ) / 100;

                    taxableAmount += taxable;
                    vatAmount += vat;
                    totalAmount += total;

                    return {
                        product_id:
                            item.product_id || null,

                        description:
                            String(
                                item.description || ""
                            ).trim(),

                        quantity,

                        unit_price: unitPrice,

                        discount_percent: discountPercent,

                        vat_rate: vatRate,

                        taxable_amount: taxable,

                        vat_amount: vat,

                        total_amount: total,

                        sort_order:
                            item.sort_order ??
                            index
                    };
                }
            );


            // -----------------------------
            // CONTROLLO DESCRIZIONI
            // -----------------------------

            const invalidItem =
                calculatedItems.find(
                    item => !item.description
                );

            if (invalidItem) {
                return res.status(400).json({
                    message:
                        "Ogni riga deve avere una descrizione"
                });
            }


            // -----------------------------
            // ARROTONDAMENTO TOTALI
            // -----------------------------

            taxableAmount =
                Math.round(taxableAmount * 100) / 100;

            vatAmount =
                Math.round(vatAmount * 100) / 100;

            totalAmount =
                Math.round(totalAmount * 100) / 100;


            // -----------------------------
            // CONNESSIONE
            // -----------------------------

            await conn.beginTransaction();
            transactionStarted = true;


            // -----------------------------
            // GENERAZIONE NUMERO FATTURA
            // -----------------------------

            const invoiceYear =
                new Date(invoice_date).getFullYear();

            const prefix =
                `FT${invoiceYear}`;

            const previousInvoices =
                await conn.query(`
                    SELECT invoice_number
                    FROM invoices
                    WHERE invoice_number LIKE ?
                    ORDER BY invoice_number DESC
                    LIMIT 1
                `, [
                    `${prefix}%`
                ]);


            let progressive = 1;


            if (previousInvoices.length > 0) {

                const lastNumber =
                    previousInvoices[0].invoice_number;

                const lastProgressive =
                    Number(
                        lastNumber.substring(
                            prefix.length
                        )
                    );

                progressive =
                    lastProgressive + 1;
            }


            const generatedInvoiceNumber =
                prefix +
                String(progressive).padStart(3, '0');


            console.log(
                'Numero fattura generato:',
                generatedInvoiceNumber
            );


            // -----------------------------
            // INSERT TESTATA
            // -----------------------------

            const invoiceResult =
                await conn.query(`
                    INSERT INTO invoices
                    (
                        invoice_number,
                        invoice_date,
                        payment_due_date,
                        payment_method_id,
                        document_type,
                        client_id,
                        user_owner_id,
                        taxable_amount,
                        vat_amount,
                        total_amount,
                        status,
                        notes
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    generatedInvoiceNumber,

                    invoice_date,

                    payment_due_date || null,

                    payment_method_id || null,

                    document_type || "INVOICE",

                    client_id,

                    req.user.id,

                    taxableAmount,

                    vatAmount,

                    totalAmount,

                    status || "DRAFT",

                    notes?.trim() || null
                ]);


            const invoiceId =
                Number(invoiceResult.insertId);


            // -----------------------------
            // INSERT RIGHE
            // -----------------------------

            for (const item of calculatedItems) {

                await conn.query(`
                    INSERT INTO invoice_items
                    (
                        invoice_id,
                        product_id,
                        description,
                        quantity,
                        unit_price,
                        discount_percent,
                        vat_rate,
                        taxable_amount,
                        vat_amount,
                        total_amount,
                        sort_order
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    invoiceId,

                    item.product_id,

                    item.description,

                    item.quantity,

                    item.unit_price,

                    item.discount_percent,

                    item.vat_rate,

                    item.taxable_amount,

                    item.vat_amount,

                    item.total_amount,

                    item.sort_order
                ]);
            }


            // -----------------------------
            // COMMIT
            // -----------------------------

            await conn.commit();
            transactionStarted = false;


            return res.status(201).json({

                message:
                    "Fattura creata correttamente",

                id: invoiceId,

                invoice_number:
                    generatedInvoiceNumber,

                totals: {
                    taxable_amount:
                        taxableAmount,

                    vat_amount:
                        vatAmount,

                    total_amount:
                        totalAmount
                }
            });


        } catch (error) {

            if (conn && transactionStarted) {

                try {
                    await conn.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Errore rollback:",
                        rollbackError
                    );
                }
            }

            console.error(
                "Errore creazione fattura:",
                error
            );

            return res.status(error.status === 400 ? 400 : 500).json({
                message: error.status === 400
                    ? error.message
                    : "Errore durante la creazione della fattura"
            });

        } finally {

            if (conn) {
                conn.release();
            }
        }
    }
);

app.get("/api/invoices/:id", authenticateToken, async (req, res) => {

    const invoiceId = Number(req.params.id)

    if (!invoiceId) {
        return res.status(400).json({
            message: "ID fattura non valido"
        })
    }

    let conn

    try {

        conn = await db.getConnection()
        const isAdmin = ["admin", "superadmin"].includes(
            String(req.user?.role || "").toLowerCase()
        );
        const ownerFilter = isAdmin
            ? ""
            : "AND i.user_owner_id = ?";
        const invoiceParams = isAdmin
            ? [invoiceId]
            : [invoiceId, req.user.id];

        // -----------------------------
        // TESTATA FATTURA
        // -----------------------------

        const invoices = await conn.query(`
            SELECT
                i.id,
                i.invoice_number,
                i.invoice_date,
                i.payment_due_date,
                i.payment_method_id,
                i.document_type,
                i.client_id,
                i.user_owner_id,
                i.taxable_amount,
                i.vat_amount,
                i.total_amount,
                i.status,
                i.notes,

                c.codice_cliente,
                c.ragione_sociale,
                c.partita_iva,
                c.codice_fiscale,
                c.indirizzo,
                c.city,
                c.province,
                c.zip_code,
                billing_country.nome AS country_name,
                c.city_ship,
                c.province_ship,
                c.zip_code_ship,
                c.indirizzo_ship,
                shipping_country.nome AS country_ship_name,
                CONCAT_WS(' ', NULLIF(owner.nome, ''), NULLIF(owner.cognome, '')) AS owner_name,
                owner.username AS owner_username,

                pm.name AS payment_method_name

            FROM invoices i

            LEFT JOIN clients c
                ON c.id = i.client_id

            LEFT JOIN countries billing_country
                ON billing_country.id = c.country_id

            LEFT JOIN countries shipping_country
                ON shipping_country.id = c.country_id_ship

            LEFT JOIN users owner
                ON owner.id = i.user_owner_id

            LEFT JOIN payment_methods pm
                ON pm.id = i.payment_method_id

            WHERE i.id = ?
            ${ownerFilter}

            LIMIT 1
        `, invoiceParams)


        if (invoices.length === 0) {

            return res.status(404).json({
                message: "Fattura non trovata"
            })
        }


        const invoice = invoices[0]


        // -----------------------------
        // RIGHE FATTURA
        // -----------------------------

        const items = await conn.query(`
            SELECT
                ii.id,
                ii.invoice_id,
                ii.product_id,
                ii.description,
                ii.quantity,
                ii.unit_price,
                ii.discount_percent,
                ii.vat_rate,
                ii.taxable_amount,
                ii.vat_amount,
                ii.total_amount,
                ii.sort_order

            FROM invoice_items ii

            WHERE ii.invoice_id = ?

            ORDER BY
                ii.sort_order ASC,
                ii.id ASC
        `, [invoiceId])


        // -----------------------------
        // RISPOSTA
        // -----------------------------

        return res.json({
            ...invoice,
            items
        })


    } catch (error) {

        console.error(
            "Errore caricamento fattura:",
            error
        )

        return res.status(500).json({
            message:
                "Errore durante il caricamento della fattura"
        })

    } finally {

        if (conn) {
            conn.release()
        }
    }
})

app.put("/api/invoices/:id", authenticateToken, async (req, res) => {

    const invoiceId = Number(req.params.id)

    const {
        invoice_number,
        invoice_date,
        payment_due_date,
        payment_method_id,
        document_type,
        client_id,
        status,
        notes,
        items
    } = req.body

    let conn
    let transactionStarted = false

    try {

        // -----------------------------
        // VALIDAZIONE
        // -----------------------------

        if (!invoiceId) {
            return res.status(400).json({
                message: "ID fattura non valido"
            })
        }

        if (!invoice_number) {
            return res.status(400).json({
                message: "Numero fattura obbligatorio"
            })
        }

        if (!invoice_date) {
            return res.status(400).json({
                message: "Data fattura obbligatoria"
            })
        }

        if (!client_id) {
            return res.status(400).json({
                message: "Cliente obbligatorio"
            })
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "La fattura deve contenere almeno una riga"
            })
        }


        // -----------------------------
        // CALCOLO RIGHE
        // -----------------------------

        let taxableAmount = 0
        let vatAmount = 0
        let totalAmount = 0

        conn = await db.getConnection()
        const discountTiersByProduct =
            await loadQuantityDiscountTiers(conn, items)

        const calculatedItems = items.map((item, index) => {

            const quantity =
                Number(item.quantity)

            const unitPrice =
                Number(item.unit_price)

            const vatRate =
                Number(item.vat_rate)

            const productId = item.product_id
                ? Number(item.product_id)
                : null

            if (
                !Number.isSafeInteger(quantity) ||
                quantity < 1 ||
                !Number.isFinite(unitPrice) ||
                unitPrice < 0 ||
                !Number.isFinite(vatRate) ||
                vatRate < 0
            ) {
                const validationError = new Error(
                    `Invalid values on invoice row ${index + 1}`
                )
                validationError.status = 400
                throw validationError
            }

            const discountPercent = getQuantityDiscountPercent(
                discountTiersByProduct.get(productId),
                quantity
            )

            const grossTaxable =
                Math.round(quantity * unitPrice * 100) / 100

            const discountAmount =
                Math.round(grossTaxable * discountPercent) / 100

            const taxable = grossTaxable - discountAmount

            const vat =
                Math.round(
                    taxable *
                    vatRate /
                    100 *
                    100
                ) / 100

            const total =
                Math.round(
                    (taxable + vat) * 100
                ) / 100

            taxableAmount += taxable
            vatAmount += vat
            totalAmount += total

            return {
                product_id:
                    item.product_id || null,

                description:
                    String(
                        item.description || ""
                    ).trim(),

                quantity,
                unit_price: unitPrice,
                discount_percent: discountPercent,
                vat_rate: vatRate,
                taxable_amount: taxable,
                vat_amount: vat,
                total_amount: total,
                sort_order:
                    item.sort_order ?? index
            }
        })


        // -----------------------------
        // VALIDAZIONE RIGHE
        // -----------------------------

        const invalidItem =
            calculatedItems.find(
                item => !item.description
            )

        if (invalidItem) {
            return res.status(400).json({
                message:
                    "Ogni riga deve avere una descrizione"
            })
        }


        // -----------------------------
        // ARROTONDAMENTO TOTALI
        // -----------------------------

        taxableAmount =
            Math.round(taxableAmount * 100) / 100

        vatAmount =
            Math.round(vatAmount * 100) / 100

        totalAmount =
            Math.round(totalAmount * 100) / 100


        // -----------------------------
        // CONNESSIONE
        // -----------------------------

        await conn.beginTransaction()
        transactionStarted = true

        const isAdmin = ["admin", "superadmin"].includes(
            String(req.user?.role || "").toLowerCase()
        );
        const ownerFilter = isAdmin
            ? ""
            : "AND user_owner_id = ?";
        const invoiceParams = isAdmin
            ? [invoiceId]
            : [invoiceId, req.user.id];

        // -----------------------------
        // CONTROLLO ESISTENZA
        // -----------------------------

        const existingInvoice = await conn.query(`
            SELECT
                id,
                invoice_number
            FROM invoices
            WHERE id = ?
            ${ownerFilter}
            LIMIT 1
        `, invoiceParams)

        if (existingInvoice.length === 0) {

            await conn.rollback()

            return res.status(404).json({
                message: "Fattura non trovata"
            })
        }

        const currentInvoiceNumber =
            existingInvoice[0].invoice_number

        // -----------------------------
        // CONTROLLO NUMERO DUPLICATO
        // -----------------------------

        const duplicate = await conn.query(`
            SELECT id
            FROM invoices
            WHERE invoice_number = ?
            AND id <> ?
            LIMIT 1
        `, [
            invoice_number.trim(),
            invoiceId
        ])

        if (duplicate.length > 0) {

            await conn.rollback()

            return res.status(409).json({
                message:
                    "Esiste già una fattura con questo numero"
            })
        }


        // -----------------------------
        // UPDATE TESTATA
        // -----------------------------

        await conn.query(`
            UPDATE invoices
            SET
                invoice_date = ?,
                payment_due_date = ?,
                payment_method_id = ?,
                document_type = ?,
                client_id = ?,
                taxable_amount = ?,
                vat_amount = ?,
                total_amount = ?,
                status = ?,
                notes = ?
            WHERE id = ?
        `, [

            invoice_date,

            payment_due_date || null,

            payment_method_id || null,

            document_type || "INVOICE",

            client_id,

            taxableAmount,

            vatAmount,

            totalAmount,

            status || "DRAFT",

            notes?.trim() || null,

            invoiceId
        ])


        // -----------------------------
        // ELIMINO VECCHIE RIGHE
        // -----------------------------

        await conn.query(`
            DELETE FROM invoice_items
            WHERE invoice_id = ?
        `, [invoiceId])


        // -----------------------------
        // REINSERT RIGHE
        // -----------------------------

        for (const item of calculatedItems) {

            await conn.query(`
                INSERT INTO invoice_items
                (
                    invoice_id,
                    product_id,
                    description,
                    quantity,
                    unit_price,
                    discount_percent,
                    vat_rate,
                    taxable_amount,
                    vat_amount,
                    total_amount,
                    sort_order
                )
                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                invoiceId,

                item.product_id,

                item.description,

                item.quantity,
                item.unit_price,
                item.discount_percent,
                item.vat_rate,

                item.taxable_amount,

                item.vat_amount,

                item.total_amount,

                item.sort_order
            ])
        }


        // -----------------------------
        // COMMIT
        // -----------------------------

        await conn.commit()
        transactionStarted = false


        return res.json({

            message:
                "Fattura modificata correttamente",

            id: invoiceId,

            invoice_number:
                currentInvoiceNumber,

            totals: {
                taxable_amount:
                    taxableAmount,

                vat_amount:
                    vatAmount,

                total_amount:
                    totalAmount
            }
        })


    } catch (error) {

        if (conn && transactionStarted) {

            try {
                await conn.rollback()
            } catch (rollbackError) {

                console.error(
                    "Errore rollback:",
                    rollbackError
                )
            }
        }

        console.error(
            "Errore modifica fattura:",
            error
        )

        return res.status(error.status === 400 ? 400 : 500).json({
            message: error.status === 400
                ? error.message
                : "Errore durante la modifica della fattura"
        })

    } finally {

        if (conn) {
            conn.release()
        }
    }
})

app.delete(
    "/api/invoices/:id",
    authenticateToken,
    async (req, res) => {

        const invoiceId = Number(req.params.id)

        if (!invoiceId) {
            return res.status(400).json({
                message: "ID fattura non valido"
            })
        }

        let conn

        try {

            conn = await db.getConnection()

            await conn.beginTransaction()

            const isAdmin = ["admin", "superadmin"].includes(
                String(req.user?.role || "").toLowerCase()
            );
            const ownerFilter = isAdmin
                ? ""
                : "AND user_owner_id = ?";
            const invoiceParams = isAdmin
                ? [invoiceId]
                : [invoiceId, req.user.id];

            // -----------------------------
            // CONTROLLO ESISTENZA FATTURA
            // -----------------------------

            const existing = await conn.query(`
                SELECT
                    id,
                    invoice_number
                FROM invoices
                WHERE id = ?
                ${ownerFilter}
                LIMIT 1
            `, invoiceParams)


            if (existing.length === 0) {

                await conn.rollback()

                return res.status(404).json({
                    message: "Fattura non trovata"
                })
            }


            // -----------------------------
            // ELIMINO RIGHE
            // -----------------------------

            await conn.query(`
                DELETE FROM invoice_items
                WHERE invoice_id = ?
            `, [invoiceId])


            // -----------------------------
            // ELIMINO FATTURA
            // -----------------------------

            await conn.query(`
                DELETE FROM invoices
                WHERE id = ?
            `, [invoiceId])


            // -----------------------------
            // COMMIT
            // -----------------------------

            await conn.commit()


            return res.json({

                message:
                    "Fattura eliminata correttamente",

                id: invoiceId,

                invoice_number:
                    existing[0].invoice_number
            })


        } catch (error) {

            if (conn) {

                try {
                    await conn.rollback()
                } catch (rollbackError) {

                    console.error(
                        "Errore rollback:",
                        rollbackError
                    )
                }
            }

            console.error(
                "Errore eliminazione fattura:",
                error
            )

            return res.status(500).json({
                message:
                    "Errore durante l'eliminazione della fattura"
            })

        } finally {

            if (conn) {
                conn.release()
            }
        }
    }
)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});