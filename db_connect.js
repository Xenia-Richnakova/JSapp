const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mysql = require('mysql2');
const app = express();
const bodyParser = require('body-parser')
var fs = require('fs');
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');


// Middleware to parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to parse application/json
app.use(bodyParser.json());

// Set up session middleware
app.use(session({
  secret: secret, // Replace with a strong secret key
  resave: false,
  saveUninitialized: true
}));

// Set up flash middleware
app.use(flash());


// Create a connection to the database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'sakila'
});

// Connect to the database
connection.connect((err) => {

  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database as ID', connection.threadId);
});


// Read Template
async function readTemplate(fileName, replaceValue, searchValue) {
  try {
    // Read the file content synchronously
    let data = fs.readFileSync(fileName, 'utf8');
    let updatedContent = data
    // Replace the specific string with the provided string
      // if I need to replace just one string
      if (typeof searchValue == 'string') {
        updatedContent = data.replace(searchValue, replaceValue);
      }
      // if I ned to replace an array of strings
      if (typeof searchValue == 'object') {
        for (let i = 0; i < replaceValue.length; i++) {
          updatedContent = updatedContent.replace(searchValue[i], replaceValue[i]);
        }
      }

    // Return the modified content
    return updatedContent;
  } catch (err) {
    console.error('Error reading or processing the file:', err);
    throw err; // Rethrow the error to be handled by the caller
  }
}



var isAuthenticated = false;
var logedUser = 0


app.post('/login', (req, res) => {
  const { username, password } = req.body;
  //console.log("THIS IS ", isAuthenticated);
  
  connection.query(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`, (error, results) => {
    console.log(results);
    if (error) {
      console.error('Error executing query:', error.stack);
      res.send('Error fetching data');
      return;
    }
    if (results.length === 1) {
      isAuthenticated = true;
      logedUser = results[0].user_id
      console.log(logedUser);
      res.redirect('/');
    }

    if (results.length === 0) {
      readTemplate('login.html', '<p>Invalid username or password</p>', '<p style="display: none;">$TO_REPLACE</p>')
      .then((page) => res.send(page))
    }
  })
});

app.post("/logout-form", (req, res) => {
  isAuthenticated = false
  res.redirect("/")
})

app.post("/createUser-form", (req, res) => {
  readTemplate("signUp.html", "", "").then( (page) => res.send(page))
})

app.post("/signup", (req, res) => {
  const {username, password, email} = req.body
  connection.query(`INSERT INTO users (username, password, email) VALUES('${username}', '${password}', '${email}') `, (error, results) => {
    console.log(results);
    if (error) {
      console.error('Error executing query:', error.stack);
      res.send('Error fetching data');
      return;
    }
    else {
      readTemplate("SignUpSuccessful.html", username, "$username").then( (page) => res.send(page))
    }
   
  })
})


// Serve the HTML file
app.get('/', (req, res) => {
  const successMessage = req.flash('success');


  if (isAuthenticated) {

  // Query the database
  connection.query(`SELECT * FROM employees WHERE user_id = ${logedUser}`, (error, results) => {
    if (error) {
      console.error('Error executing query:', error.stack);
      res.send('Error fetching data');
      return;
    }

    let tableData = ""
    // Loop through the results and add rows to the table
    results.forEach(row => {
      tableData += `
        <tr class="border-b">
          <td class="py-3 px-4">${row.first_name}</td>
          <td class="py-3 px-4">${row.last_name}</td>
          <td class="py-3 px-4">${row.email}</td>
          <td class="py-3 px-4">
                <svg id="${row.id}" class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
            </svg>
        </td>
        <td>
          <a>
            <svg name="${row.id}" class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.779 17.779 4.36 19.918 6.5 13.5m4.279 4.279 8.364-8.643a3.027 3.027 0 0 0-2.14-5.165 3.03 3.03 0 0 0-2.14.886L6.5 13.5m4.279 4.279L6.499 13.5m2.14 2.14 6.213-6.504M12.75 7.04 17 11.28"/>
          </svg>
          </a>
        </td>
        </tr>`;
    });

    readTemplate("template.html", [tableData, successMessage], ['$TO_REPLACE', '$replaceMessage'])
    .then( 
      (page) => res.send(page) 
    );
  });

}
else {
  let data = fs.readFileSync("login.html", 'utf8');
  res.send(data)

}
});


app.post("/submit-form", (req, res) => {
  const FirstName = req.body.firstName 
  const LastName = req.body.lastName
  const Email = req.body.email

  const query = 'INSERT INTO employees (first_name, last_name, email, user_id) VALUES (?, ?, ?, ?)';


  connection.query(query, [FirstName, LastName, Email, logedUser], (error, results) => {
    if (error) {
      console.error('Error inserting data:', error.stack);
      res.send('Error inserting data');
      return;
    }

    res.redirect('/'); 
  })

})



// DELETE route to handle deletion
app.delete('/delete/:id', (req, res) => {
  const id = req.params.id;

  const query = 'DELETE FROM employees WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error deleting data:', err.stack);
      res.status(500).send('Error deleting data');
      return;
    }

    res.status(200).send('Deleted successfully');
  });
});



// EDIT Element
app.get('/edit/:id', (req, res) => { 
  let query = "SELECT * FROM employees WHERE id = ?";
  connection.query(query, [req.params.id], (err, r) => {
    if (err) {
      console.error('Error to access element to edit: ', err.stack);
      res.status(500).send('Error to access element to edit');
      return;
    }
    readTemplate("editForm.html", [req.params.id, r[0].first_name, r[0].last_name, r[0].email], ['$ID', '$firstName', '$lastName', '$email'])
    .then( 
      (page) => res.send(page) 
    );
  });
})

app.post('/edit-form', (req, res) => {
  const id = req.body.elemID
  const FirstName = req.body.firstName 
  const LastName = req.body.lastName
  const Email = req.body.email

  let query = `UPDATE employees
               SET first_name = '${FirstName}', last_name = '${LastName}', email = '${Email}'
               WHERE id = ?;`
  connection.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error not able to edit element: ', err.stack);
      res.status(500).send('Error not able to edit element:');
      return;
    }

    req.flash('success', `Employee ${FirstName} ${LastName} successfully edited`);
    res.redirect('/')
  })
})


const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
