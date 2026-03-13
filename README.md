# 🛍️ Khaki Secure E‑Commerce Website

A **secure modern e‑commerce web application** built from the **Khaki
front‑end template** and extended with a **NodeJS + SQL Server backend**
while integrating modern **Cybersecurity protections**.

------------------------------------------------------------------------

# 🚀 Project Overview

This project demonstrates how to build a **secure online shopping
platform** using modern web technologies and best cybersecurity
practices.

Users can:

-   Browse products
-   Manage a shopping cart
-   Place orders
-   Complete online payments
-   Login securely using Google OAuth
-   Access their order history

The system also demonstrates **real‑world web security implementations**
such as MFA, password hashing, logging, and SQL injection prevention.

------------------------------------------------------------------------

# 🧱 Tech Stack

## Frontend

-   ReactJS
-   HTML / CSS / JavaScript
-   Responsive UI (Khaki Template)

## Backend

-   NodeJS
-   ExpressJS
-   RESTful API Architecture

## Database

-   Microsoft SQL Server

## Authentication

-   JWT Authentication
-   OAuth2 Google Login

## Encryption

-   bcrypt / Argon2 (Password Hashing)

## Security Protection

-   Google reCAPTCHA v3
-   SQL Injection Prevention
-   Multi‑Factor Authentication (MFA)
-   Secure Logging

## DevOps

-   Docker containerization

------------------------------------------------------------------------

# ✨ Core Features

## 👤 User Features

-   User registration
-   Secure login system
-   Google OAuth login
-   Browse product catalog
-   Shopping cart system
-   Checkout & payment
-   Order tracking
-   Profile management

## 🛠️ Admin Features

-   Product management
-   Category management
-   Inventory management
-   Order management
-   System monitoring

------------------------------------------------------------------------

# 🔐 Cybersecurity Implementation

  Security Feature           Purpose
  -------------------------- -------------------------------------
  MFA                        Adds second layer of login security
  JWT                        Secure API authentication
  Password Hashing           Protect user passwords
  Payment Security           Secure transaction integration
  System Logging             Detect suspicious activities
  SQL Injection Protection   Prevent database attacks
  reCAPTCHA v3               Prevent bot traffic and spam

------------------------------------------------------------------------

# 🗄️ Database Design (Core Tables)

## Users

-   id (PK)
-   email
-   password_hash
-   google_id
-   role
-   mfa_enabled
-   created_at

## Products

-   id (PK)
-   name
-   description
-   price
-   stock
-   category_id
-   created_at

## Categories

-   id (PK)
-   name
-   description

## Carts

-   id (PK)
-   user_id
-   created_at

## Cart Items

-   id (PK)
-   cart_id
-   product_id
-   quantity

## Orders

-   id (PK)
-   user_id
-   total_price
-   status
-   payment_id
-   created_at

## Order Items

-   id (PK)
-   order_id
-   product_id
-   price
-   quantity

## Payments

-   id (PK)
-   order_id
-   provider
-   payment_status
-   transaction_id
-   created_at

## System Logs

-   id (PK)
-   user_id
-   action
-   ip_address
-   created_at

## MFA Tokens

-   id (PK)
-   user_id
-   secret
-   verified

------------------------------------------------------------------------

# 🏗️ System Architecture

    ReactJS Frontend
            │
            ▼
    NodeJS (Express API)
            │
    Authentication Layer
    (JWT + OAuth2)
            │
    Security Layer
    (MFA, reCAPTCHA, Logging)
            │
            ▼
    SQL Server Database

------------------------------------------------------------------------

# 🐳 Deployment

The application will be containerized using **Docker** to support:

-   Easy deployment
-   Isolated development environments
-   Security testing & penetration testing

------------------------------------------------------------------------

# 🎯 Project Goal

Build a **secure, scalable, and modern e‑commerce platform** that
demonstrates:

-   Real‑world backend architecture
-   Secure authentication
-   Cybersecurity best practices
-   Modern full‑stack development

------------------------------------------------------------------------

# 📚 Educational Value

This project is designed for:

-   Web Development learning
-   Cybersecurity research
-   Secure software engineering practice
