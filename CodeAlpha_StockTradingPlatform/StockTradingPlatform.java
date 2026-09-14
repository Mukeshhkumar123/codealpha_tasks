import java.io.*;
import java.util.*;

/*
 * TASK 2: STOCK TRADING PLATFORM
 *
 * Features:
 * 1. Display market data
 * 2. Buy stocks
 * 3. Sell stocks
 * 4. View portfolio
 * 5. Track profit/loss
 * 6. View transaction history
 * 7. Save portfolio to file
 *
 * OOP Concepts Used:
 * - Classes and Objects
 * - Encapsulation
 * - Constructors
 * - Methods
 * - ArrayList
 */

// --------------------------------------------------
// STOCK CLASS
// --------------------------------------------------

class Stock {
    private String symbol;
    private String companyName;
    private double price;

    public Stock(String symbol, String companyName, double price) {
        this.symbol = symbol;
        this.companyName = companyName;
        this.price = price;
    }

    public String getSymbol() {
        return symbol;
    }

    public String getCompanyName() {
        return companyName;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public void displayStock() {
        System.out.printf(
                "%-10s %-25s ₹%.2f%n",
                symbol,
                companyName,
                price
        );
    }
}


// --------------------------------------------------
// PORTFOLIO ITEM CLASS
// --------------------------------------------------

class PortfolioItem {
    private Stock stock;
    private int quantity;
    private double averageBuyPrice;

    public PortfolioItem(Stock stock, int quantity, double buyPrice) {
        this.stock = stock;
        this.quantity = quantity;
        this.averageBuyPrice = buyPrice;
    }

    public Stock getStock() {
        return stock;
    }

    public int getQuantity() {
        return quantity;
    }

    public double getAverageBuyPrice() {
        return averageBuyPrice;
    }

    public void addShares(int quantity, double price) {

        double totalValue =
                (this.quantity * this.averageBuyPrice)
                        + (quantity * price);

        this.quantity += quantity;

        this.averageBuyPrice =
                totalValue / this.quantity;
    }

    public void removeShares(int quantity) {
        this.quantity -= quantity;
    }

    public double getCurrentValue() {
        return quantity * stock.getPrice();
    }

    public double getInvestedValue() {
        return quantity * averageBuyPrice;
    }

    public double getProfitLoss() {
        return getCurrentValue() - getInvestedValue();
    }
}


// --------------------------------------------------
// TRANSACTION CLASS
// --------------------------------------------------

class Transaction {

    private String type;
    private String stockSymbol;
    private int quantity;
    private double price;
    private String date;

    public Transaction(
            String type,
            String stockSymbol,
            int quantity,
            double price) {

        this.type = type;
        this.stockSymbol = stockSymbol;
        this.quantity = quantity;
        this.price = price;

        this.date = new Date().toString();
    }

    public void displayTransaction() {

        System.out.println("------------------------------------");

        System.out.println("Type      : " + type);
        System.out.println("Stock     : " + stockSymbol);
        System.out.println("Quantity  : " + quantity);
        System.out.printf("Price     : ₹%.2f%n", price);
        System.out.println("Date      : " + date);
    }

    public String toFileString() {

        return type + "," +
                stockSymbol + "," +
                quantity + "," +
                price + "," +
                date;
    }
}


// --------------------------------------------------
// USER CLASS
// --------------------------------------------------

class User {

    private String name;
    private double balance;

    private ArrayList<PortfolioItem> portfolio;
    private ArrayList<Transaction> transactions;

    public User(String name, double balance) {

        this.name = name;
        this.balance = balance;

        portfolio = new ArrayList<>();
        transactions = new ArrayList<>();
    }

    public String getName() {
        return name;
    }

    public double getBalance() {
        return balance;
    }

    // --------------------------------------------------
    // BUY STOCK
    // --------------------------------------------------

    public void buyStock(Stock stock, int quantity) {

        if (quantity <= 0) {
            System.out.println("Invalid quantity.");
            return;
        }

        double totalCost =
                stock.getPrice() * quantity;

        if (totalCost > balance) {

            System.out.println("Insufficient balance.");

            return;
        }

        balance -= totalCost;

        PortfolioItem item = null;

        for (PortfolioItem p : portfolio) {

            if (p.getStock().getSymbol()
                    .equalsIgnoreCase(stock.getSymbol())) {

                item = p;
                break;
            }
        }

        if (item == null) {

            item = new PortfolioItem(
                    stock,
                    quantity,
                    stock.getPrice()
            );

            portfolio.add(item);

        } else {

            item.addShares(
                    quantity,
                    stock.getPrice()
            );
        }

        Transaction transaction =
                new Transaction(
                        "BUY",
                        stock.getSymbol(),
                        quantity,
                        stock.getPrice()
                );

        transactions.add(transaction);

        System.out.println();
        System.out.println("Stock purchased successfully!");
        System.out.printf("Total cost: ₹%.2f%n", totalCost);
    }


    // --------------------------------------------------
    // SELL STOCK
    // --------------------------------------------------

    public void sellStock(Stock stock, int quantity) {

        if (quantity <= 0) {

            System.out.println("Invalid quantity.");

            return;
        }

        PortfolioItem item = null;

        for (PortfolioItem p : portfolio) {

            if (p.getStock().getSymbol()
                    .equalsIgnoreCase(stock.getSymbol())) {

                item = p;
                break;
            }
        }

        if (item == null) {

            System.out.println(
                    "You do not own this stock."
            );

            return;
        }

        if (item.getQuantity() < quantity) {

            System.out.println(
                    "You don't have enough shares."
            );

            return;
        }

        double totalValue =
                stock.getPrice() * quantity;

        balance += totalValue;

        item.removeShares(quantity);

        if (item.getQuantity() == 0) {
            portfolio.remove(item);
        }

        Transaction transaction =
                new Transaction(
                        "SELL",
                        stock.getSymbol(),
                        quantity,
                        stock.getPrice()
                );

        transactions.add(transaction);

        System.out.println();
        System.out.println("Stock sold successfully!");

        System.out.printf(
                "Amount received: ₹%.2f%n",
                totalValue
        );
    }


    // --------------------------------------------------
    // DISPLAY PORTFOLIO
    // --------------------------------------------------

    public void displayPortfolio() {

        System.out.println();
        System.out.println("========== YOUR PORTFOLIO ==========");

        if (portfolio.isEmpty()) {

            System.out.println(
                    "Your portfolio is empty."
            );

            return;
        }

        System.out.printf(
                "%-10s %-10s %-15s %-15s %-15s%n",
                "Stock",
                "Qty",
                "Buy Price",
                "Current",
                "P/L"
        );

        System.out.println(
                "------------------------------------------------------------"
        );

        double totalInvested = 0;
        double totalCurrent = 0;

        for (PortfolioItem item : portfolio) {

            double invested =
                    item.getInvestedValue();

            double current =
                    item.getCurrentValue();

            double profitLoss =
                    item.getProfitLoss();

            totalInvested += invested;
            totalCurrent += current;

            System.out.printf(
                    "%-10s %-10d ₹%-14.2f ₹%-14.2f ₹%-14.2f%n",

                    item.getStock().getSymbol(),

                    item.getQuantity(),

                    item.getAverageBuyPrice(),

                    item.getStock().getPrice(),

                    profitLoss
            );
        }

        System.out.println(
                "------------------------------------------------------------"
        );

        System.out.printf(
                "Total Invested : ₹%.2f%n",
                totalInvested
        );

        System.out.printf(
                "Current Value  : ₹%.2f%n",
                totalCurrent
        );

        System.out.printf(
                "Overall P/L    : ₹%.2f%n",
                totalCurrent - totalInvested
        );

        System.out.printf(
                "Cash Balance   : ₹%.2f%n",
                balance
        );

        System.out.printf(
                "Total Wealth   : ₹%.2f%n",
                balance + totalCurrent
        );
    }


    // --------------------------------------------------
    // TRANSACTION HISTORY
    // --------------------------------------------------

    public void displayTransactions() {

        System.out.println();
        System.out.println(
                "========== TRANSACTION HISTORY =========="
        );

        if (transactions.isEmpty()) {

            System.out.println(
                    "No transactions yet."
            );

            return;
        }

        for (Transaction transaction :
                transactions) {

            transaction.displayTransaction();
        }
    }


    // --------------------------------------------------
    // SAVE DATA TO FILE
    // --------------------------------------------------

    public void saveData() {

        try {

            FileWriter writer =
                    new FileWriter("portfolio.txt");

            writer.write(
                    "USER: " + name + "\n"
            );

            writer.write(
                    "BALANCE: " + balance + "\n\n"
            );

            writer.write(
                    "PORTFOLIO:\n"
            );

            for (PortfolioItem item :
                    portfolio) {

                writer.write(
                        item.getStock().getSymbol()
                                + " | Quantity: "
                                + item.getQuantity()
                                + " | Average Buy Price: "
                                + item.getAverageBuyPrice()
                                + "\n"
                );
            }

            writer.write(
                    "\nTRANSACTIONS:\n"
            );

            for (Transaction transaction :
                    transactions) {

                writer.write(
                        transaction.toFileString()
                                + "\n"
                );
            }

            writer.close();

            System.out.println(
                    "Portfolio saved successfully!"
            );

        } catch (IOException e) {

            System.out.println(
                    "Error saving data: "
                            + e.getMessage()
            );
        }
    }
}


// --------------------------------------------------
// MAIN CLASS
// --------------------------------------------------

public class StockTradingPlatform {

    public static void main(String[] args) {

        Scanner scanner =
                new Scanner(System.in);

        // --------------------------------------------
        // CREATE MARKET STOCKS
        // --------------------------------------------

        ArrayList<Stock> stocks =
                new ArrayList<>();

        stocks.add(
                new Stock(
                        "RELIANCE",
                        "Reliance Industries",
                        2850.50
                )
        );

        stocks.add(
                new Stock(
                        "TCS",
                        "Tata Consultancy Services",
                        3650.25
                )
        );

        stocks.add(
                new Stock(
                        "INFY",
                        "Infosys",
                        1750.75
                )
        );

        stocks.add(
                new Stock(
                        "HDFC",
                        "HDFC Bank",
                        1680.40
                )
        );

        stocks.add(
                new Stock(
                        "ITC",
                        "ITC Limited",
                        475.80
                )
        );


        // --------------------------------------------
        // CREATE USER
        // --------------------------------------------

        System.out.print(
                "Enter your name: "
        );

        String name =
                scanner.nextLine();

        User user =
                new User(name, 100000);


        // --------------------------------------------
        // MAIN MENU
        // --------------------------------------------

        while (true) {

            System.out.println();
            System.out.println(
                    "=========================================="
            );

            System.out.println(
                    "       STOCK TRADING PLATFORM"
            );

            System.out.println(
                    "=========================================="
            );

            System.out.println(
                    "Welcome, " + user.getName()
            );

            System.out.printf(
                    "Balance: ₹%.2f%n",
                    user.getBalance()
            );

            System.out.println();

            System.out.println(
                    "1. Display Market Data"
            );

            System.out.println(
                    "2. Buy Stock"
            );

            System.out.println(
                    "3. Sell Stock"
            );

            System.out.println(
                    "4. View Portfolio"
            );

            System.out.println(
                    "5. Transaction History"
            );

            System.out.println(
                    "6. Save Portfolio"
            );

            System.out.println(
                    "7. Exit"
            );

            System.out.print(
                    "\nEnter your choice: "
            );

            int choice =
                    scanner.nextInt();


            // ----------------------------------------
            // OPTION 1
            // ----------------------------------------

            if (choice == 1) {

                System.out.println();

                System.out.println(
                        "========== MARKET DATA =========="
                );

                System.out.printf(
                        "%-10s %-25s %s%n",
                        "Symbol",
                        "Company",
                        "Price"
                );

                System.out.println(
                        "---------------------------------------------"
                );

                for (Stock stock : stocks) {

                    stock.displayStock();
                }
            }


            // ----------------------------------------
            // OPTION 2 - BUY
            // ----------------------------------------

            else if (choice == 2) {

                System.out.print(
                        "Enter stock symbol: "
                );

                String symbol =
                        scanner.next();

                Stock selectedStock =
                        findStock(stocks, symbol);

                if (selectedStock == null) {

                    System.out.println(
                            "Stock not found."
                    );

                } else {

                    System.out.print(
                            "Enter quantity: "
                    );

                    int quantity =
                            scanner.nextInt();

                    user.buyStock(
                            selectedStock,
                            quantity
                    );
                }
            }


            // ----------------------------------------
            // OPTION 3 - SELL
            // ----------------------------------------

            else if (choice == 3) {

                System.out.print(
                        "Enter stock symbol: "
                );

                String symbol =
                        scanner.next();

                Stock selectedStock =
                        findStock(stocks, symbol);

                if (selectedStock == null) {

                    System.out.println(
                            "Stock not found."
                    );

                } else {

                    System.out.print(
                            "Enter quantity: "
                    );

                    int quantity =
                            scanner.nextInt();

                    user.sellStock(
                            selectedStock,
                            quantity
                    );
                }
            }


            // ----------------------------------------
            // OPTION 4
            // ----------------------------------------

            else if (choice == 4) {

                user.displayPortfolio();
            }


            // ----------------------------------------
            // OPTION 5
            // ----------------------------------------

            else if (choice == 5) {

                user.displayTransactions();
            }


            // ----------------------------------------
            // OPTION 6
            // ----------------------------------------

            else if (choice == 6) {

                user.saveData();
            }


            // ----------------------------------------
            // OPTION 7
            // ----------------------------------------

            else if (choice == 7) {

                System.out.println(
                        "Thank you for using the Stock Trading Platform!"
                );

                break;
            }


            // ----------------------------------------
            // INVALID OPTION
            // ----------------------------------------

            else {

                System.out.println(
                        "Invalid choice. Try again."
                );
            }
        }

        scanner.close();
    }


    // --------------------------------------------
    // FIND STOCK
    // --------------------------------------------

    public static Stock findStock(
            ArrayList<Stock> stocks,
            String symbol) {

        for (Stock stock : stocks) {

            if (stock.getSymbol()
                    .equalsIgnoreCase(symbol)) {

                return stock;
            }
        }

        return null;
    }
}