const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StockSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    index: {
      type: String,
    },
    sector: {
      type: String,
    },
    screeningResult: {
      type: Boolean,
    },
    liabilities: {
      type: String,
    },
    equity: {
      type: String,
    },
    dPerE: {
      type: String,
    },
    averageRevenue: {
      type: String,
    },
    NPM: {
      type: String,
    },
    averageNPM: {
      type: String,
    },
    ROE: {
      type: String,
    },
    CG: {
      type: String,
    },
    auditor: {
      type: String,
    },
    freeFloat: {
      type: String,
    },
    created: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'Stock',
  },
);

const Stock = (module.exports = mongoose.model('Stock', StockSchema));
