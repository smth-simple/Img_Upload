import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  url: { type: String, required: true },
  usageCount: { type: Number, default: 0 },
  language: String,
  locale: String,         // 👈 Add this
  description: String,    // 👈 And this
  textAmount: String,
  imageType: String,
  metadata: mongoose.Schema.Types.Mixed
});

const Photo = mongoose.model('Photo', photoSchema);
export default Photo;
