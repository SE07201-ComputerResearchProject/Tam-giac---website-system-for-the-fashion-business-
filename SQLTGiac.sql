CREATE TABLE payment_transactions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    payment_id INT,
    transaction_code NVARCHAR(255),
    gateway_response NVARCHAR(MAX),
    status NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (payment_id) REFERENCES payments(id)
);