module.exports = {
  reactStrictMode: true,
  env: {
    YNAB_CLIENT_ID: process.env.YNAB_CLIENT_ID,
    YNAB_REDIRECT_URI: process.env.YNAB_REDIRECT_URI_LOCAL,
    YNAB_CLIENT_SECRET: process.env.YNAB_CLIENT_SECRET,
    DB_API_HOST: process.env.DB_API_HOST,
  },
};
