const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2'); 
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail address
    pass: process.env.GMAIL_PASS, // Your App Password
  },
});


const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,  
    queueLimit: 0         
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));


// Function to send email
const sendEmail = async (to, subject, htmlContent) => {
  try {
    await transporter.sendMail({
      from: `"BIGGYASSETS" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

app.post('/api/auth/register', (req, res) => {
  const { full_name, email, username, password, referral_code } = req.body;

  // Validate input
  if (!full_name || !email || !username || !password) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }

  // Check if referral code exists
  let referrerId = null;
  if (referral_code) {
    pool.query('SELECT id FROM users WHERE referral_code = ?', [referral_code], (error, results) => {
      if (error) {
        console.error('Error checking referral code:', error);
        return res.status(500).json({ message: 'Error registering user.' });
      }

      if (results.length > 0) {
        referrerId = results[0].id;
      }

      // Insert user into database
      pool.query(
        'INSERT INTO users (full_name, email, username, password, referral_code) VALUES (?, ?, ?, ?, ?)',
        [full_name, email, username, password, referral_code],
        (error, results) => {
          if (error) {
            console.error('Error inserting user into the database:', error);
            return res.status(500).json({ message: 'Error registering user.' });
          }

          // Send welcome email
          sendEmail(
            email,
            'Welcome to ',
            `
              <h1>Hello ${username},</h1>
              <p>Welcome to our investment platform! Your account has been successfully created.</p>
              <p>We offer the following investment plans:</p>
              <ul>
                <li><a href="https://biggyinvestments.onrender.com/signin.html">Buy </a></li>
                <li><a href="https://biggyinvestments.onrender.com/signin.html">Buy Plan 2</a></li>
                <li><a href="https://biggyinvestments.onrender.com/signin.html">Buy Plan 3</a></li>
              </ul>
              <p>Click on any of the above plans to log in and start investing!</p>
            `
          );

          // Redirect to login page
          res.redirect('/signin.html');
        }
      );
    });
  } else {
    // Insert user into database without referral
    pool.query(
      'INSERT INTO users (full_name, email, username, password) VALUES (?, ?, ?, ?)',
      [full_name, email, username, password],
      (error, results) => {
        if (error) {
          console.error('Error inserting user into the database:', error);
          return res.status(500).json({ message: 'Error registering user.' });
        }

        // Send welcome email
        sendEmail(
          email,
          'Welcome to Biggyassets',
          `
          <div style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
      <table width="100%" style="max-width: 600px; margin: auto; border-collapse: collapse;">
        <tr>
          <td style="text-align: center; padding: 20px;">
            <img src="https://github.com/biggyinvestments/biggyinvestments/blob/main/images/biggy%20logo.png?raw=true" alt="Company Logo" style="max-width: 100%; height: auto;"/>
          </td>
        </tr>
        <tr>
          <td style="background-color: #740000; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">Welcome, ${username}!</h1>
          </td>
        </tr>
        <tr>
          <td style="background-color: white; padding: 20px;">
            <p style="font-size: 16px; line-height: 1.5;">Your account has been successfully created. We're excited to have you on board!</p>
            <p style="font-size: 16px; line-height: 1.5;">We offer the following investment plans:</p>
            <ul style="list-style-type: none; padding: 0;">
              <li style="margin: 10px 0;">
                <a href="https://biggyinvestments.onrender.com/signin.html" style="display: inline-block; background-color: #740000; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Buy Plan 1</a>
              </li>
              <li style="margin: 10px 0;">
                <a href="https://biggyinvestments.onrender.com/signin.html" style="display: inline-block; background-color: #740000; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Buy Plan 2</a>
              </li>
              <li style="margin: 10px 0;">
                <a href="https://biggyinvestments.onrender.com/signin.html" style="display: inline-block; background-color: #740000; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Buy Plan 3</a>
              </li>
            </ul>
            <p style="font-size: 16px; line-height: 1.5;">Click on any of the above plans to log in and start investing!</p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f4f4f4; padding: 10px; text-align: center;">
            <p style="font-size: 12px; color:#740000;">&copy; 2024 Biggyassets. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </div>
          
          `
        );

        // Redirect to login page
        res.redirect('/signin.html');
      }
    );
  }
});


// Route for user login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check if the user is an admin
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        return res.redirect('/admindash.html');
    }

    // Query to check if the user is a regular user
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    pool.query(query, [email, password], (error, results) => {
        if (error) {
            console.error('Error querying the database:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length > 0) {
            // User authenticated successfully
            const user = results[0]; // Assuming the first result is the user
            res.json({
                message: 'Login successful',
                username: user.username // Send username in response
            });
        } else {
            // Authentication failed
            res.status(401).json({ error: 'Invalid email or password' });
        }
    });
});



  app.get('/users', (req, res) => {
    const username = req.query.username;
    const db = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
  
    db.connect((err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ message: 'Error connecting to database' });
      } else {
        db.query(`SELECT * FROM users WHERE username = ?`, [username], (err, rows) => {
          if (err) {
            console.error(err);
            res.status(500).json({ message: 'Error retrieving user data' });
          } else {
            console.log(rows); // Log retrieved data in terminal
            rows.forEach((row) => {
              row.days_since_creation = Math.floor((new Date() - new Date(row.created_at)) / (1000 * 60 * 60 * 24));
              row.created_at = row.created_at.toISOString().split('T')[0]; // Format the created_at timestamp to only show the date
            });
            res.json(rows);
            db.end();
          }
        });
      }
    });
  });


  app.post('/api/deposit', async (req, res) => {
    try {
      const { 
        username, 
        depositAmount, 
        planName, 
        planPrincipleReturn, 
        planCreditAmount, 
        planDepositFee, 
        planDebitAmount, 
        depositMethod 
      } = req.body;
  
      // Validate request body
      if (!username || !planName || !planCreditAmount || !depositAmount || !depositMethod) {
        return res.status(400).json({ message: "Please provide all required fields" });
      }
  
      // Check if user exists
      const [userResult] = await pool.promise().query('SELECT * FROM users WHERE username = ?', [username]);
      const user = userResult[0]; // Select the first user
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Handle balance deduction if deposit method is balance
      if (depositMethod === 'balance') {
        if (user.balance < depositAmount) {
          return res.status(400).json({ message: 'Insufficient balance' });
        }
        
        // Deduct the deposit amount from user's balance
        await pool.promise().query('UPDATE users SET balance = balance - ? WHERE username = ?', [depositAmount, username]);
      }
  
      // Calculate investment end date based on plan
      const planEndTimes = {
        '20% RIO AFTER 24 HOURS': 48 * 60 * 60 * 1000, // 48 hours in milliseconds
        '50% RIO AFTER 72 HOURS': 72 * 60 * 60 * 1000, // 72 hours in milliseconds
        '100% RIO AFTER 96 HOURS': 96 * 60 * 60 * 1000, // 96 hours in milliseconds
        '200% RIO AFTER 120 HOURS': 120 * 60 * 60 * 1000 // 120 hours in milliseconds
      };
  
      const investmentStartDate = new Date();
      const investmentEndDate = new Date(investmentStartDate.getTime() + (planEndTimes[planName] || 0));
  
      // Insert a new transaction into the transactions table
      await pool.promise().query(
        `INSERT INTO transactions 
         (username, plan_name, plan_principle_return, plan_credit_amount, plan_deposit_fee, plan_debit_amount, deposit_method, transaction_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [username, planName, planPrincipleReturn, planCreditAmount, planDepositFee, planDebitAmount, depositMethod]
      );
  
      // Insert the same details into the deposits table
      await pool.promise().query(
        `INSERT INTO deposits 
         (user_id, amount, date, investment_start_date, investment_end_date, plan_name, plan_principle_return, plan_credit_amount, plan_deposit_fee, plan_debit_amount, deposit_method, status) 
         VALUES ((SELECT id FROM users WHERE username = ?), ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [username, depositAmount, investmentStartDate, investmentEndDate, planName, planPrincipleReturn, planCreditAmount, planDepositFee, planDebitAmount, depositMethod]
      );




       // Send confirmation email
       const emailContent = `
       <div style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
         <table width="100%" style="max-width: 600px; margin: auto; border-collapse: collapse;">
           <tr>
             <td style="text-align: center; padding: 20px;">
               <img src="https://github.com/biggyinvestments/biggyinvestments/blob/main/images/biggy%20logo.png?raw=true" alt="Company Logo" style="max-width: 100%; height: auto;" />
             </td>
           </tr>
           <tr>
             <td style="background-color: #740000; padding: 20px; text-align: center; color: white;">
               <h1 style="margin: 0;">Deposit Successful!</h1>
             </td>
           </tr>
           <tr>
             <td style="background-color: white; padding: 20px;">
               <p style="font-size: 16px; line-height: 1.5;">Dear ${username},</p>
               <p style="font-size: 16px; line-height: 1.5;">Your deposit of $${depositAmount} has been successfully submitted. The deposit will be reflected in the "Active Deposits" tab once confirmed by the admin after blockchain verification.</p>
               <p style="font-size: 16px; line-height: 1.5;">Thank you for investing with us!</p>
               <a href="https://biggyinvestments.onrender.com/signin.html" style="display: inline-block; background-color: #740000; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Return to Dashboard</a>
             </td>
           </tr>
           <tr>
             <td style="background-color: #f4f4f4; padding: 10px; text-align: center;">
               <p style="font-size: 12px; color: #740000;">&copy; 2024 Biggyassets. All rights reserved.</p>
             </td>
           </tr>
         </table>
       </div>
     `;
 
     // Call sendEmail to notify the user
     sendEmail(user.email, 'Deposit Confirmation', emailContent);


  
      res.json({ success: true, message: 'Deposit successful. Confirmation email sent.' });
    } catch (err) {
      console.error('Error processing deposit:', err); // Enhanced error logging
      res.status(500).json({ message: 'Error processing deposit' });
    }
  });
  


  
  const checkInvestmentEnd = async () => {
    try {
      const now = new Date();
  
      // Find deposits where the end date has passed
      const [deposits] = await pool.promise().query(
        `SELECT * FROM deposits 
         WHERE investment_end_date <= ? AND status = 'pending'`,
        [now]
      );
  
      for (const deposit of deposits) {
        // Update user's balance
        await pool.promise().query(
          `UPDATE users 
           SET balance = balance + ?, total_deposits = total_deposits + ? 
           WHERE id = ?`,
          [deposit.amount, deposit.amount, deposit.user_id]
        );
  
        // Update deposit status to 'completed'
        await pool.promise().query(
          `UPDATE deposits 
           SET status = 'completed' 
           WHERE id = ?`,
          [deposit.id]
        );
      }
  
      console.log('Investment end check completed.');
    } catch (err) {
      console.error('Error checking investments:', err);
    }
  };


// Route to get the number of recent investment packages
app.get('/api/admin/recent-investments', (req, res) => {
  // Query to count recent investments from the last 3 days
  const query = `
      SELECT COUNT(*) AS recent_investments
      FROM investments
      WHERE start_date >= NOW() - INTERVAL 3 DAY;
  `;

  // Execute the query
  pool.query(query, (err, results) => {
      if (err) {
          console.error('Error querying the database:', err);
          return res.status(500).json({ message: 'Error fetching recent investments' });
      }

      // Send the count of recent investments as JSON
      res.json({ recent_investments: results[0].recent_investments });
  });
});

// Endpoint to get the count of pending deposits
app.get('/api/admin/pending-deposits/count', (req, res) => {
  const query = 'SELECT COUNT(*) AS pending_deposits FROM deposits WHERE status = ?';
  
  pool.query(query, ['pending'], (err, results) => {
      if (err) {
          console.error('Error querying the database:', err);
          return res.status(500).json({ message: 'Error fetching pending deposits count' });
      }
      
      // Send the count as a JSON response
      res.json(results[0]);
  });
});


app.get('/api/admin/pending-deposits', (req, res) => {
  const query = 'SELECT id, user_id, amount, plan_name, status, date FROM deposits WHERE status = ?';
  
  pool.query(query, ['pending'], (err, results) => {
      if (err) {
          console.error('Error querying the database:', err);
          return res.status(500).json({ message: 'Error fetching pending deposits' });
      }
      
      res.json(results);
  });
});

// Approve a deposit
app.post('/api/admin/approve-deposit', (req, res) => {
  const { depositId } = req.body;

  // Step 1: Get the deposit details including the plan name
  pool.query('SELECT * FROM deposits WHERE id = ?', [depositId], (err, depositResult) => {
    if (err) {
      console.error('Error fetching deposit details:', err);
      return res.status(500).json({ message: 'Error approving deposit' });
    }

    if (!depositResult.length) {
      return res.status(404).json({ message: 'Deposit not found' });
    }

    const { user_id, amount, plan_name, investment_start_date } = depositResult[0];

    // Step 2: Get the plan details (duration and profit)
    pool.query('SELECT duration, profit FROM plans WHERE name = ?', [plan_name], (err, planResult) => {
      if (err) {
        console.error('Error fetching plan details:', err);
        return res.status(500).json({ message: 'Error approving deposit' });
      }

      if (!planResult.length) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      const { duration, profit } = planResult[0];

      // Step 3: Calculate investment end date and interest
      const startDate = new Date(investment_start_date);
      const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
      const interest = amount * (profit / 100);

      // Step 4: Approve deposit by updating the status
      pool.query('UPDATE deposits SET status = ? WHERE id = ?', ['approved', depositId], (err) => {
        if (err) {
          console.error('Error updating deposit status:', err);
          return res.status(500).json({ message: 'Error approving deposit' });
        }

        // Step 5: Insert details into active_deposits table
        pool.query(
          `INSERT INTO active_deposits (user_id, amount, interest, plan_name, profit, investment_start_date, investment_end_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [user_id, amount, interest, plan_name, profit, startDate, endDate],
          (err) => {
            if (err) {
              console.error('Error inserting into active_deposits:', err);
              return res.status(500).json({ message: 'Error approving deposit' });
            }

            res.json({ message: 'Deposit approved and moved to active deposits successfully' });
          }
        );
      });
    });
  });
});

// Reject a deposit
app.post('/api/admin/reject-deposit', (req, res) => {
  const { depositId } = req.body;

  // Step 1: Move deposit to rejected_deposits
  pool.query(
    'INSERT INTO rejected_deposits (id, user_id, amount, status, date) SELECT id, user_id, amount, status, date FROM deposits WHERE id = ?',
    [depositId],
    (err, result) => {
      if (err) {
        console.error('Error moving deposit to rejected_deposits:', err);
        return res.status(500).json({ message: 'Error rejecting deposit' });
      }

      const user_id = result.insertId;

      // Step 2: Remove deposit from deposits table
      pool.query('DELETE FROM deposits WHERE id = ?', [depositId], (err) => {
        if (err) {
          console.error('Error deleting deposit:', err);
          return res.status(500).json({ message: 'Error rejecting deposit' });
        }

        res.json({ message: 'Deposit rejected successfully' });
      });
    }
  );
});


// Route to get the total amount withdrawn by all users
app.get('/api/admin/total-withdrawals', (req, res) => {
  const query = 'SELECT SUM(amount) AS totalWithdrawals FROM withdrawals';

  pool.query(query, (err, results) => {
      if (err) {
          console.error('Error querying the database:', err);
          return res.status(500).json({ error: 'Internal server error' });
      }
      
      res.json({ totalWithdrawals: results[0].totalWithdrawals || 0 });
  });
});


// Route to get the total amount deposited by all users
app.get('/api/admin/total-deposits', (req, res) => {
  const query = 'SELECT SUM(amount) AS totalDeposits FROM deposits';

  pool.query(query, (err, results) => {
      if (err) {
          console.error('Error querying the database:', err);
          return res.status(500).json({ error: 'Internal server error' });
      }
      
      res.json({ totalDeposits: results[0].totalDeposits || 0 });
      
  });
});


// Route to get the total available balance for all users
app.get('/api/admin/total-balance', (req, res) => {
  const query = 'SELECT SUM(balance) AS totalBalance FROM users';

  pool.query(query, (err, results) => {
      if (err) {
          console.error('Error querying the database:', err);
          return res.status(500).json({ error: 'Internal server error' });
      }
      
      res.json({ totalBalance: results[0].totalBalance || 0 });
      
  });
});



// Route to fetch bitcoin_address and balance on page load
app.get('/api/user-info', (req, res) => {
  const { username } = req.query; // Username will be sent from the frontend

  pool.query(
      'SELECT bitcoin_address, balance FROM users WHERE username = ?',
      [username],
      (error, results) => {
          if (error) {
              console.error('Error fetching user info:', error);
              return res.status(500).json({ message: 'Error fetching user info.' });
          }
          if (results.length === 0) {
              return res.status(404).json({ message: 'User not found.' });
          }
          const userInfo = results[0];
          res.json(userInfo); // Send the bitcoin_address and balance
      }
  );
});




// Route to handle withdrawal requests
app.post('/api/withdraw', (req, res) => {
  const { username, amount, method, walletAddress, bankDetails } = req.body;

  console.log("Withdrawal request received for user:", username);
  console.log("Amount:", amount);
  console.log("Withdrawal method:", method);

  // Step 1: Query the user's balance from the database
  pool.query('SELECT balance, email FROM users WHERE username = ?', [username], (error, results) => {
      if (error) {
          console.error('Error fetching user balance:', error);
          return res.status(500).json({ message: 'Error checking balance.' });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: 'User not found.' });
      }

      const userBalance = parseFloat(results[0].balance); // Parse balance as a float
      const withdrawalAmount = parseFloat(amount); // Parse withdrawal amount as a float
      const userEmail = results[0].email;

      // Debugging logs for balance and amount
      console.log("User's current balance:", userBalance);
      console.log("Withdrawal amount:", withdrawalAmount);

      // Step 2: Check if the withdrawal amount is greater than the user's balance
      if (userBalance < withdrawalAmount) {
          console.log("Insufficient balance! User balance:", userBalance, "Requested amount:", withdrawalAmount);
          return res.status(400).json({ message: 'Insufficient balance for this withdrawal.' });
      }

      // Step 3: Insert the withdrawal request into pending_withdrawals table with wallet or bank details
      let query = '';
      let queryParams = [];

      if (method === 'bank') {
          // If bank withdrawal
          const { bankName, accountName, accountNumber } = bankDetails;

          query = 'INSERT INTO pending_withdrawals (username, amount, method, bank_name, account_name, account_number) VALUES (?, ?, ?, ?, ?, ?)';
          queryParams = [username, withdrawalAmount, method, bankName, accountName, accountNumber];

          console.log("Bank withdrawal for user:", username);
          console.log("Bank Details:", bankName, accountName, accountNumber);
      } else if (method === 'wallet') {
          // If wallet withdrawal
          query = 'INSERT INTO pending_withdrawals (username, amount, method, wallet_address) VALUES (?, ?, ?, ?)';
          queryParams = [username, withdrawalAmount, method, walletAddress];

          console.log("Wallet withdrawal for user:", username);
          console.log("Wallet Address:", walletAddress);
      } else {
          return res.status(400).json({ message: 'Invalid withdrawal method selected.' });
      }

      // Execute the query to insert withdrawal request
      pool.query(query, queryParams, (error, results) => {
          if (error) {
              console.error('Error inserting withdrawal request:', error);
              return res.status(500).json({ message: 'Error processing withdrawal.' });
          }

          // Step 4: Deduct the withdrawal amount from the user's balance
          pool.query(
              'UPDATE users SET balance = balance - ? WHERE username = ?',
              [withdrawalAmount, username],
              (error) => {
                  if (error) {
                      console.error('Error deducting balance:', error);
                      return res.status(500).json({ message: 'Error processing withdrawal.' });
                  }

                  // Step 5: Send withdrawal confirmation email
                  const emailContent = `
                    <div style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
                      <table width="100%" style="max-width: 600px; margin: auto; border-collapse: collapse;">
                        <tr>
                          <td style="text-align: center; padding: 20px;">
                          <img src="https://github.com/biggyinvestments/biggyinvestments/blob/main/images/biggy%20logo.png?raw=true" alt="Company Logo" style="max-width: 100%; height: auto;" />
                          </td>
                        </tr>
                        <tr>
                          <td style="background-color:  #740000; padding: 20px; text-align: center; color: white;">
                            <h1 style="margin: 0;">Withdrawal Request Submitted</h1>
                          </td>
                        </tr>
                        <tr>
                          <td style="background-color: white; padding: 20px;">
                            <p style="font-size: 16px; line-height: 1.5;">Dear ${username},</p>
                            <p style="font-size: 16px; line-height: 1.5;">We have received your withdrawal request of $${withdrawalAmount}.</p>
                            <p style="font-size: 16px; line-height: 1.5;">Your request is currently pending and will be processed once approved by the admin.</p>
                            ${
                              method === 'wallet'
                                ? `<p style="font-size: 16px; line-height: 1.5;"></p>`
                                : `<p style="font-size: 16px; line-height: 1.5;"></p>
                                   <p style="font-size: 16px; line-height: 1.5;"></p>
                                   <p style="font-size: 16px; line-height: 1.5;"></p>`
                            }
                            <p style="font-size: 16px; line-height: 1.5;">Thank you for using our platform!</p>
                            <a href="" style="display: inline-block; background-color:  #740000; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Return to Dashboard</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="background-color: #f4f4f4; padding: 10px; text-align: center;">
                            <p style="font-size: 12px; color: #3e059b;">&copy; 2024 Memecointech. All rights reserved.</p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  `;

                  sendEmail(userEmail, 'Withdrawal Request Submitted', emailContent);

                  // Success response
                  res.json({ message: 'Withdrawal request submitted successfully. Your withdrawal is still pending until Admin confirms.' });
              }
          );
      });
  });
});




// Route to get user balance
app.get('/api/user-balance', (req, res) => {
  const username = req.query.username;

  const query = 'SELECT balance FROM users WHERE username = ?';
  
  pool.query(query, [username], (err, results) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      // Convert balance to number
      const balance = Number(results[0].balance);
      res.json({ balance });
  });
});




// Route to get the count of pending deposits
app.get('/api/admin/pending-deposits/count', (req, res) => {
    pool.query(
        'SELECT COUNT(*) AS count FROM pending_deposits',
        (error, results) => {
            if (error) {
                console.error('Error fetching pending deposits count:', error);
                return res.status(500).json({ message: 'Error fetching pending deposits count' });
            }
            const count = results[0].count;
            res.json({ count });
        }
    );
});




// Route to get all pending withdrawals for admin
app.get('/api/admin/pending-withdrawals', (req, res) => {
  // Ensure the query selects wallet_address as well
  const query = 'SELECT id, username, amount, wallet_address, status FROM pending_withdrawals WHERE status = ?';
  pool.query(query, ['pending'], (error, results) => {
    if (error) {
      console.error('Error fetching pending withdrawals:', error);
      return res.status(500).json({ message: 'Error fetching pending withdrawals' });
    }
    res.json(results);
  });
});



app.get('/api/pending-withdrawals', (req, res) => {
  pool.query('SELECT * FROM pending_withdrawals', (error, results) => {
      if (error) {
          console.error('Error fetching pending withdrawals:', error);
          return res.status(500).json({ message: 'Error fetching pending withdrawals' });
      }
      res.json(results);
  });
});

// Route to get the total number of users
app.get('/api/admin/total-users', (req, res) => {
  pool.query('SELECT COUNT(*) AS total_users FROM users', (error, results) => {
      if (error) {
          console.error('Error fetching total users:', error);
          return res.status(500).json({ message: 'Error fetching total users.' });
      }
      res.json(results[0]);
  });
});


// Route to get all users' details
app.get('/api/admin/users', (req, res) => {
  const query = `
      SELECT id, full_name, email, username, bitcoin_address, referral_code, created_at, balance, total_withdrawals, total_deposits
      FROM users
  `;
  pool.query(query, (error, results) => {
      if (error) {
          console.error('Error fetching user details:', error);
          return res.status(500).json({ message: 'Error fetching user details.' });
      }
      res.json(results);
  });
});


// Approve withdrawal with email notification and detailed query check
app.post('/api/admin/approve-withdrawal', (req, res) => {
  const { id, username, amount } = req.body;

  // Update status to 'approved' in the pending_withdrawals table
  pool.query('UPDATE pending_withdrawals SET status = ? WHERE id = ?', ['approved', id], (error, result) => {
      if (error) {
          console.error('Error approving withdrawal:', error);
          return res.status(500).json({ message: 'Error approving withdrawal' });
      }

      // Check if any rows were affected
      if (result.affectedRows === 0) {
          console.error('No rows updated. Possible incorrect ID:', id);
          return res.status(404).json({ message: 'Withdrawal not found or already processed' });
      }

      console.log('Withdrawal approved, ID:', id);

      // Send email notification after approval
      pool.query('SELECT email FROM users WHERE username = ?', [username], (err, results) => {
          if (err) {
              console.error('Error fetching user email:', err);
              return res.status(500).json({ message: 'Error fetching user information' });
          }

          const userEmail = results[0]?.email;
          if (userEmail) {
              const mailOptions = {
                  from: 'your_email@gmail.com',
                  to: userEmail,
                  subject: 'Withdrawal Approved',
                  text: `Dear ${username}, your withdrawal of $${amount} has been approved!`
              };

              transporter.sendMail(mailOptions, (mailError) => {
                  if (mailError) {
                      console.error('Error sending email:', mailError);
                  }
              });
          }

          res.json({ message: 'Withdrawal approved successfully and email notification sent!' });
      });
  });
});

// Reject withdrawal with email notification and detailed query check
app.post('/api/admin/reject-withdrawal', (req, res) => {
  const { id, username, amount } = req.body;

  // Update status to 'rejected' in the pending_withdrawals table
  pool.query('UPDATE pending_withdrawals SET status = ? WHERE id = ?', ['rejected', id], (error, result) => {
      if (error) {
          console.error('Error rejecting withdrawal:', error);
          return res.status(500).json({ message: 'Error rejecting withdrawal' });
      }

      // Check if any rows were affected
      if (result.affectedRows === 0) {
          console.error('No rows updated. Possible incorrect ID:', id);
          return res.status(404).json({ message: 'Withdrawal not found or already processed' });
      }

      console.log('Withdrawal rejected, ID:', id);

      // Refund the amount back to the user's balance
      pool.query('UPDATE users SET balance = balance + ? WHERE username = ?', [amount, username], (err, updateResult) => {
          if (err) {
              console.error('Error updating user balance:', err);
              return res.status(500).json({ message: 'Error updating user balance' });
          }

          // Send email notification after rejection
          pool.query('SELECT email FROM users WHERE username = ?', [username], (emailError, results) => {
              if (emailError) {
                  console.error('Error fetching user email:', emailError);
                  return res.status(500).json({ message: 'Error fetching user information' });
              }

              const userEmail = results[0]?.email;
              if (userEmail) {
                  const mailOptions = {
                      from: 'your_email@gmail.com',
                      to: userEmail,
                      subject: 'Withdrawal Rejected',
                      text: `Dear ${username}, your withdrawal of $${amount} has been rejected and the amount has been refunded to your balance.`
                  };

                  transporter.sendMail(mailOptions, (mailError) => {
                      if (mailError) {
                          console.error('Error sending email:', mailError);
                      }
                  });
              }

              res.json({ message: 'Withdrawal rejected, amount refunded, and email notification sent!' });
          });
      });
  });
});






// Function to check for completed investments
async function checkCompletedInvestments() {
  try {
    // Get the current date
    const currentDate = new Date();
    
    // Query for completed investments
    const [completedDeposits] = await pool.promise().query(
      'SELECT * FROM active_deposits WHERE investment_end_date <= ?',
      [currentDate]
    );

    for (const deposit of completedDeposits) {
      const { user_id, amount, interest, plan_name, investment_end_date } = deposit;

      // Update the user's balance
      await pool.promise().query(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [amount + interest, user_id]
      );

      // Archive the completed deposit
      await pool.promise().query(
        'INSERT INTO completed_deposits (user_id, amount, interest, plan_name, investment_start_date, investment_end_date) VALUES (?, ?, ?, ?, ?, ?)',
        [user_id, amount, interest, plan_name, deposit.investment_start_date, investment_end_date]
      );

      // Delete the deposit from active_deposits
      await pool.promise().query(
        'DELETE FROM active_deposits WHERE id = ?',
        [deposit.id]
      );
    }

    console.log('Completed investments processed successfully');
  } catch (err) {
    console.error('Error processing completed investments:', err);
  }
}

// Schedule the cron job to run every hour
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled task to check completed investments');
  checkCompletedInvestments();
});


app.get('/api/user-dashboard', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    // Fetch data from all relevant tables
    const [activeDepositResult] = await pool.promise().query(
      'SELECT amount FROM active_deposits WHERE user_id = (SELECT id FROM users WHERE username = ?) ORDER BY investment_end_date DESC LIMIT 1',
      [username]
    );
    const mostRecentActiveDeposit = activeDepositResult.length > 0 ? activeDepositResult[0].amount : 0;

    const [pendingWithdrawalsResult] = await pool.promise().query(
      'SELECT SUM(amount) AS totalPendingWithdrawals FROM pending_withdrawals WHERE username = ? AND status = "pending"',
      [username]
    );
    const totalPendingWithdrawals = pendingWithdrawalsResult[0].totalPendingWithdrawals || 0;

    const [totalWithdrawnResult] = await pool.promise().query(
      'SELECT SUM(amount) AS totalWithdrawn FROM pending_withdrawals WHERE username = ? AND status = "approved"',
      [username]
    );
    const totalWithdrawn = totalWithdrawnResult[0].totalWithdrawn || 0;


    const [lastDepositResult] = await pool.promise().query(
      'SELECT amount FROM deposits WHERE user_id = (SELECT id FROM users WHERE username = ?) ORDER BY date DESC LIMIT 1',
      [username]
    );
    const lastDeposit = lastDepositResult.length > 0 ? lastDepositResult[0].amount : 0;

    const [totalDepositsResult] = await pool.promise().query(
      'SELECT total_deposits FROM users WHERE username = ?',
      [username]
    );
    const totalDeposits = totalDepositsResult.length > 0 ? totalDepositsResult[0].total_deposits : 0;

    const [lastWithdrawalResult] = await pool.promise().query(
      'SELECT amount FROM pending_withdrawals WHERE username = ? ORDER BY request_date DESC LIMIT 1',
      [username]
    );
    const lastWithdrawal = lastWithdrawalResult.length > 0 ? lastWithdrawalResult[0].amount : 0;

    // Send the response with all the data
    res.json({
      mostRecentActiveDeposit,
      totalPendingWithdrawals,
      totalWithdrawn,
      lastDeposit,
      totalDeposits,
      lastWithdrawal
    });
  } catch (err) {
    console.error('Error fetching user dashboard data:', err);
    res.status(500).json({ message: 'Error fetching user dashboard data' });
  }
});


// Endpoint to get user details
app.get('/api/admin/user-details', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Fetch user details from the database
    const [result] = await pool.promise().query(
      'SELECT id, full_name, email, username, bitcoin_address, referral_code, created_at, balance, total_withdrawals, total_deposits FROM users WHERE id = ?',
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the user details as the response
    res.json(result[0]);
  } catch (err) {
    console.error('Error fetching user details:', err);
    res.status(500).json({ message: 'Error fetching user details' });
  }
});
 


// Route to handle adding a penalty
app.post('/api/admin/add-penalty', async (req, res) => {
  const { userId, penaltyAmount, penaltyType, description, authPassword } = req.body;

  if (authPassword !== 'AdMiN') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    // Find user by userId
    const [user] = await pool.promise().query('SELECT * FROM users WHERE id = ?', [userId]);

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Deduct penalty from the user's balance
    const newBalance = user[0].balance - parseFloat(penaltyAmount);

    // Update user's balance
    await pool.promise().query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);

    // Log penalty in penalties table
    await pool.promise().query('INSERT INTO penalties (user_id, amount, type, description) VALUES (?, ?, ?, ?)', [
        userId,
        penaltyAmount,
        penaltyType,
        description
    ]);

    // Send success response
    res.json({ success: true });

  } catch (error) {
    console.error('Error adding penalty:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



async function addBonus(userId, amount, description) {
  return new Promise((resolve, reject) => {
    // Fetch username based on userId
    pool.query('SELECT username FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) return reject(err);
      if (!results.length) return reject(new Error('User not found'));

      const username = results[0].username;

      // Update user balance
      pool.query(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [amount, userId],
        (err, results) => {
          if (err) return reject(err);
          
          // Insert into transactions table
          pool.query(
            `INSERT INTO transactions (username, plan_name, plan_credit_amount, deposit_method, transaction_date) 
             VALUES (?, ?, ?, ?, ?)`,
            [username, null, amount, 'Bonus', new Date()],
            (err, result) => {
              if (err) return reject(err);
              resolve(result);
            }
          );
        }
      );
    });
  });
}




async function logTransaction(username, planName, amount, description) {
  const transactionDate = new Date();
  await pool.promise().query(
    `INSERT INTO transactions (username, plan_name, plan_credit_amount, deposit_method, transaction_date) 
     VALUES (?, ?, ?, ?, ?)`,
    [username, planName, amount, 'Bonus/Investment', transactionDate]
  );
}

app.post('/api/admin/add-bonus-or-investment', async (req, res) => {
  const { userId, amount, actionType, planId, description, authPassword } = req.body;

  try {
    // Authenticate admin's password before proceeding
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (authPassword !== adminPassword) {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    // Fetch username based on userId
    const [user] = await pool.promise().query('SELECT username FROM users WHERE id = ?', [userId]);
    if (!user.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const username = user[0].username;

    if (actionType === 'bonus') {
      // Handle the existing bonus logic
      await addBonus(userId, amount, description);
      await logTransaction(username, null, null, description); // Pass username
      return res.json({ success: true, message: 'Bonus added successfully' });
    }

    if (actionType === 'investment') {
      const [plan] = await pool.promise().query('SELECT * FROM plans WHERE id = ?', [planId]);
      if (!plan.length) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      const { duration, profit } = plan[0];
      const investmentStartDate = new Date();
      const investmentEndDate = new Date(investmentStartDate.getTime() + duration * 60 * 60 * 1000);
      const interest = amount * (profit / 100);

      // Debugging: Log userId and other variables
      console.log('Inserting investment with:', {
        userId,
        amount,
        interest,
        planName: plan[0].name,  // Fixed reference
        profit,
        investmentStartDate,
        investmentEndDate,
      });

      // Insert the new investment into the active_deposits table
      await pool.promise().query(
        `INSERT INTO active_deposits (user_id, amount, interest, plan_name, profit, investment_start_date, investment_end_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, amount, interest, plan[0].name, profit, investmentStartDate, investmentEndDate]
      );

      // Log the transaction in the transactions table
      await logTransaction(username, plan[0].name, amount, description); // Use username

      return res.json({ success: true, message: 'Investment added successfully' });
    }

    res.status(400).json({ message: 'Invalid action type' });
  } catch (err) {
    console.error('Error in add-bonus-or-investment:', err);
    res.status(500).json({ message: 'Error in add-bonus-or-investment' });
  }
});







app.get('/api/expiring-deposits', async (req, res) => {
  try {
      const [deposits] = await pool.promise().query(`
          SELECT *, DATEDIFF(investment_end_date, NOW()) AS days_left
          FROM active_deposits
          WHERE investment_end_date > NOW()
      `);
      res.json(deposits);
  } catch (err) {
      console.error('Error fetching expiring deposits:', err);
      res.status(500).json({ message: 'Error fetching expiring deposits' });
  }
});






app.get('/get-account-details', (req, res) => {
  const username = req.query.username;

  if (!username) {
      return res.json({ success: false, message: "Username is required." });
  }

  // Get a connection from the pool
  pool.getConnection((err, connection) => {
      if (err) {
          return res.json({ success: false, message: "Error connecting to the database." });
      }

      // Query user data based on the username to get user_id
      const userQuery = `SELECT id, full_name, username, created_at, balance FROM users WHERE username = ?`;
      connection.query(userQuery, [username], (err, userResults) => {
          if (err) {
              connection.release(); // Release connection back to the pool
              return res.json({ success: false, message: "Error fetching user data." });
          }

          if (userResults.length === 0) {
              connection.release(); // Release connection back to the pool
              return res.json({ success: false, message: "User not found." });
          }

          const user = userResults[0];
          const userId = user.id;

          // Query approved deposits using user_id
          const approvedDepositsQuery = `SELECT amount, date FROM deposits WHERE user_id = ? AND status = 'approved'`;
          connection.query(approvedDepositsQuery, [userId], (err, approvedDeposits) => {
              if (err) {
                  connection.release(); // Release connection back to the pool
                  return res.json({ success: false, message: "Error fetching approved deposits." });
              }

              // Query pending deposits using user_id
              const pendingDepositsQuery = `SELECT amount, date FROM deposits WHERE user_id = ? AND status = 'pending'`;
              connection.query(pendingDepositsQuery, [userId], (err, pendingDeposits) => {
                  connection.release(); // Release connection after the last query

                  if (err) {
                      return res.json({ success: false, message: "Error fetching pending deposits." });
                  }

                  // Return account details, approved deposits, and pending deposits
                  res.json({
                      success: true,
                      full_name: user.full_name,
                      username: user.username,
                      created_at: user.created_at,
                      balance: user.balance,
                      approvedDeposits: approvedDeposits,
                      pendingDeposits: pendingDeposits
                  });
              });
          });
      });
  });
});



// Route to get user details for profile page (excluding email)
app.get('/get-user-profile', (req, res) => {
  const username = req.query.username;

  if (!username) {
    return res.json({ success: false, message: 'Username is required.' });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      return res.json({ success: false, message: 'Error connecting to the database.' });
    }

    const userQuery = `SELECT full_name, bitcoin_address, email FROM users WHERE username = ?`;
    connection.query(userQuery, [username], (err, userResult) => {
      connection.release();

      if (err) {
        return res.json({ success: false, message: 'Error fetching user data.' });
      }

      if (userResult.length === 0) {
        return res.json({ success: false, message: 'User not found.' });
      }

      res.json({
        success: true,
        full_name: userResult[0].full_name,
        bitcoin_address: userResult[0].bitcoin_address,
        email: userResult[0].email,
      });
    });
  });
});

// Route to handle profile updates
app.post('/update-profile', (req, res) => {
  const { username, full_name, bitcoin_address, email, current_password, new_password, confirm_password } = req.body;

  if (!username || !full_name || !bitcoin_address || !email) {
    return res.json({ success: false, message: 'All fields are required.' });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      return res.json({ success: false, message: 'Error connecting to the database.' });
    }

    // Validate current password if password is being changed
    if (new_password) {
      const passwordQuery = `SELECT password FROM users WHERE username = ?`;
      connection.query(passwordQuery, [username], (err, passwordResult) => {
        if (err) {
          connection.release();
          return res.json({ success: false, message: 'Error verifying password.' });
        }

        const storedPassword = passwordResult[0].password;
        if (storedPassword !== current_password) {
          connection.release();
          return res.json({ success: false, message: 'Current password is incorrect.' });
        }

        if (new_password !== confirm_password) {
          connection.release();
          return res.json({ success: false, message: 'New password and confirmation do not match.' });
        }

        // Proceed with password and profile updates
        updateProfile(connection, username, full_name, bitcoin_address, contact_info, new_password, res);
      });
    } else {
      // Update profile without changing password
      updateProfile(connection, username, full_name, bitcoin_address, email, null, res);
    }
  });
});

function updateProfile(connection, username, full_name, bitcoin_address, contact_info, new_password, res) {
  let updateQuery = `UPDATE users SET full_name = ?, bitcoin_address = ?, contact_info = ?`;
  const params = [full_name, bitcoin_address, email, username];

  if (new_password) {
    updateQuery += `, password = ?`;
    params.unshift(new_password);
  }

  updateQuery += ` WHERE username = ?`;

  connection.query(updateQuery, params, (err, result) => {
    connection.release();
    if (err) {
      return res.json({ success: false, message: 'Error updating profile.' });
    }

    res.json({ success: true, message: 'Profile updated successfully.' });
  });
}


app.get('/get-withdrawal-history', (req, res) => {
  const username = req.query.username;

  if (!username) {
      return res.json({ success: false, message: "Username is required." });
  }

  pool.getConnection((err, connection) => {
      if (err) {
          return res.json({ success: false, message: "Error connecting to the database." });
      }

      // Fetch all withdrawals (both pending and approved)
      const withdrawalQuery = `SELECT amount, status, request_date, approved_date FROM pending_withdrawals WHERE username = ?`;

      connection.query(withdrawalQuery, [username], (err, results) => {
          connection.release(); // Release connection back to the pool
          
          if (err) {
              return res.json({ success: false, message: "Error fetching withdrawal history." });
          }

          res.json({ success: true, withdrawals: results });
      });
  });
});



// Route to get earnings history
app.get('/api/earnings-history', (req, res) => {
  const username = req.body.username; // Assuming you get the username from the request body or session

  // Query the earnings table for the user's earnings
  pool.query('SELECT * FROM earnings WHERE user_id = ?', [username], (error, results) => {
      if (error) {
          console.error('Error fetching earnings history:', error);
          return res.status(500).json({ message: 'Error fetching earnings history.' });
      }

      // Send the results back to the frontend
      res.json(results);
  });
});












// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Dynamic route to serve other HTML pages
app.get('/:page', (req, res) => {
    const page = req.params.page;
    res.sendFile(path.join(__dirname, `${page}.html`));
});

// Catch-all route for any unmatched routes
app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();  // No Content
});



// Test the connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to the database');
        connection.release();  // Release the connection back to the pool
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
