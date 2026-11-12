const fs = require('fs');
const path = require('path');
const Device = require('../models/Device');

/**
 * Seeds initial devices from config/devices.json if the Device collection is empty.
 */
const seedInitialDevices = async () => {
  try {
    const count = await Device.countDocuments();
    if (count > 0) return;

    const devicesConfigPath = path.resolve(__dirname, '../../../config/devices.json');
    if (!fs.existsSync(devicesConfigPath)) return;

    const raw = fs.readFileSync(devicesConfigPath, 'utf8');
    const devices = JSON.parse(raw);

    if (Array.isArray(devices) && devices.length > 0) {
      console.log(`Seeding ${devices.length} initial devices from config/devices.json...`);
      for (const dev of devices) {
        await Device.findOneAndUpdate(
          { host: dev.host },
          { name: dev.name, host: dev.host, type: dev.type, tcp_port: dev.tcp_port },
          { upsert: true, new: true }
        );
      }
      console.log('Initial devices seeded successfully.');
    }
  } catch (err) {
    console.warn('Could not seed initial devices:', err.message);
  }
};

module.exports = seedInitialDevices;

