// server/models/Project.js
import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

export default mongoose.model('Project', ProjectSchema);
