module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const GachaDailyUsageSchema = new Schema(
    {
      _id: {
        type: String,
      },
      userId: {
        type: String,
        required: true,
        index: true,
        trim: true,
      },
      dayKey: {
        type: String,
        required: true,
        index: true,
      },
      date: {
        type: Date,
        required: true,
      },
      count: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
    },
    {
      timestamps: true,
      collection: 'gacha_daily_usages',
    }
  );

  GachaDailyUsageSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

  return mongoose.model('GachaDailyUsage', GachaDailyUsageSchema);
};
