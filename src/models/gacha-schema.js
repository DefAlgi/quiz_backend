module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const GachaResultSchema = new Schema(
    {
      prizeId: {
        type: Schema.Types.ObjectId,
        ref: 'Prize',
        default: null,
      },
      prizeName: {
        type: String,
        default: null,
      },
    },
    { _id: false }
  );

  const GachaSchema = new Schema(
    {
      userId: {
        type: String,
        required: true,
        index: true,
        trim: true,
      },
      playedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
      },
      result: {
        type: GachaResultSchema,
        default: null,
      },
    },
    {
      timestamps: true,
      collection: 'gacha_logs',
    }
  );

  GachaSchema.index({ userId: 1, playedAt: -1 });

  return mongoose.model('Gacha', GachaSchema);
};
