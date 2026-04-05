import ReviewClient from './client';

export default function ReviewPage({ params }: { params: { sessionId: string } }) {
  return <ReviewClient sessionId={params.sessionId} />;
}
