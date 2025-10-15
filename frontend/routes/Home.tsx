import Chat from '@/frontend/components/Chat';
import { v4 as uuidv4 } from 'uuid';
import { useAPIKeyStore } from '../stores/APIKeyStore';
import { useModelStore } from '../stores/ModelStore';
import APIKeyForm from '../components/APIKeyForm';
import { Key } from 'lucide-react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

export default function Home() {
  const hasRequiredKeys = useAPIKeyStore((state) => state.hasRequiredKeys());

  const isAPIKeysHydrated = useAPIKeyStore.persist?.hasHydrated();
  const isModelStoreHydrated = useModelStore.persist?.hasHydrated();

  if (!isAPIKeysHydrated || !isModelStoreHydrated) return null;

  if (!hasRequiredKeys)
    return (
      <div className='flex flex-col items-center justify-center w-full h-full max-w-sm md:max-w-3xl py-20 mx-auto'>
        <Card className='w-full max-w-2xl mx-auto'>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <Key className='h-5 w-5' />
              <CardTitle className=''>
                Add Your API Keys To Start Chatting
              </CardTitle>
            </div>
            <CardDescription>
              Keys are stored locally in your browser.
            </CardDescription>
          </CardHeader>
          <APIKeyForm />
        </Card>
      </div>
    );

  return <Chat threadId={uuidv4()} initialMessages={[]} />;
}
