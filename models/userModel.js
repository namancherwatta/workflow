import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
  name: {
    type:      String,
    required:  true,
    trim:      true,
    minlength: 2,
  },
  email: {
    type:      String,
    required:  true,
    unique:    true,  // enforced at DB level
    lowercase: true,
    trim:      true,
  },
  password: {
    type:      String,
    required:  true,
    minLength: 6,     // bcrypt hash is always stored, never plaintext
  },
})

export default mongoose.model("user", userSchema)
