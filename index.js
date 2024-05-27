import express from "express";
import pg from "pg"; 
import path from 'path';

const app = express();
const port = 3000;
const __dirname = path.resolve();

const db = new pg.Client(process.env.DATABASE_URL)
db.connect();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

async function getProductsByFunction(productFunction) {
    try {
        const searchWords = productFunction.trim().toLowerCase().split(' ');
        let query = 'SELECT productname, costperimpact, impactunit, sourcelink FROM benchmarks WHERE ';
        const values = [];
        
        searchWords.forEach((word, index) => {
            if (index > 0) query += ' AND ';
            query += `productfunction ILIKE $${index + 1}`;
            values.push(`%${word}%`);
        });

        const result = await db.query(query, values);
        console.log('Query result:', result.rows); 
        return result.rows;
    } catch (err) {
        console.error('Database query error:', err);
        throw err;
    }
}

app.get('/', (req, res) => {
    const products = [];
    res.render('index', { products }); 
});

app.post('/submit', async (req, res) => {
    const productFunction = req.body.productFunction;

    if (!productFunction) {
        return res.status(400).send('Product function is required');
    }

    try {
        const products = await getProductsByFunction(productFunction);

        if (products.length === 0) {
            res.render('nobenchmarks', { products });
        } else {
            res.render('results', { products });
        }
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

app.post('/addProduct', async (req, res) => {
    const { productname, impactunit, costperimpact, sourcelink } = req.body;

    try {
        const query = 'INSERT INTO benchmarks (productname, impactunit, costperimpact, sourcelink) VALUES ($1, $2, $3, $4)';
        const values = [productname, impactunit, costperimpact, sourcelink];
        await db.query(query, values);
        res.send('Thanks for adding to our database!');
    } catch (err) {
        console.error('Error inserting product:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/why', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'why.html'));
});

app.get('/contactus', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contactus.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});
