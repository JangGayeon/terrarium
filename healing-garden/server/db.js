const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
let connected = false;

const connect = async () => {
  if (!MONGO_URI) {
    console.warn('MONGO_URI not set; DB features disabled. Set MONGO_URI in .env to enable MongoDB integration.');
    return;
  }
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    connected = true;
    console.log('Connected to MongoDB');
  } catch (e) {
    console.error('MongoDB connection error:', e.message || e);
  }
};

// Define schemas and models
const TerrariumSchema = new mongoose.Schema({
  name: String,
  plantType: String,
  image: String,
  temp: Number,
  hum: Number,
  lux: Number,
  ledColor: String,
  createdAt: { type: Date, default: Date.now },
});

const EventSchema = new mongoose.Schema({
  terrariumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Terrarium', required: false },
  date: String, // YYYY-MM-DD
  time: String, // HH:MM
  title: String,
  actionKey: String,
  createdAt: { type: Date, default: Date.now },
});

const DeviceStateSchema = new mongoose.Schema({
  terrariumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Terrarium', required: false },
  heater: { type: Boolean, default: false },
  vent: { type: Boolean, default: false },
  water_pump: { type: Boolean, default: false },
  grow_light: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

const UploadSchema = new mongoose.Schema({
  terrariumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Terrarium', required: false },
  filename: String,
  url: String,
  createdAt: { type: Date, default: Date.now },
});

const Terrarium = mongoose.model('Terrarium', TerrariumSchema);
const Event = mongoose.model('Event', EventSchema);
const DeviceState = mongoose.model('DeviceState', DeviceStateSchema);
const Upload = mongoose.model('Upload', UploadSchema);

module.exports = {
  connect,
  isConnected: () => connected,
  models: { Terrarium, Event, DeviceState, Upload },
};
