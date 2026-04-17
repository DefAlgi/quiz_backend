module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const PrizeSchema = new Schema(
    {
      code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      quota: {
        type: Number,
        required: true,
        min: 0,
      },
      remainingQuota: {
        type: Number,
        required: true,
        min: 0,
      },
      winnerCount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
    },
    {
      timestamps: true,
      collection: 'prizes',
    }
  );

  PrizeSchema.index({ code: 1 }, { unique: true });

  return mongoose.model('Prize', PrizeSchema);
};
