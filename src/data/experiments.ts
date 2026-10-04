export const BOOKING_CTA_EXPERIMENT = {
  id: 'booking-cta-clarity-v1',
  enabled: true,
  allocation: 0.5,
  winner: null as 'a' | 'b' | null,
  minimumViewsPerVariant: 200,
  minimumClicksPerVariant: 8,
  minimumRelativeLift: 0.1,
  minimumZScore: 1.96,
  variants: {
    a: {
      label: 'baseline',
      paidCta: '',
    },
    b: {
      label: 'clarity',
      paidCta: '空室・料金を確認',
    },
  },
} as const;

export type BookingExperimentVariant = keyof typeof BOOKING_CTA_EXPERIMENT.variants;
