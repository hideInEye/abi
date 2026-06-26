import { useRouteError, useNavigate } from 'react-router-dom';
import { Button, Typography } from 'antd';
import { $t } from './src/locales'
import type { FallbackProps } from 'react-error-boundary'
import { localStg } from '@/utils/storage';


type Props = Partial<FallbackProps>;

const isDev = import.meta.env.DEV;

const { Title, Text } = Typography;

function HookSupportChecker() {
  try {
    const error = useRouteError() as Error;
    const nav = useNavigate()

    const update = () => {
      nav(0)
    }

    return { update, error };
  } catch (error) {
    return false;
  }
}

const theme = localStg.get('themeColor') || '#646cff'
const ErrorPage: FC<Props> = ({ error, resetErrorBoundary }) => {

  const hook = HookSupportChecker()

  console.error(error);

  return (
    <div className="size-full min-h-520px flex-col-center gap-16px overflow-hidden">
      <div className="flex text-400px text-primary">
        <SvgIcon localIcon="error" />
      </div>
      {isDev ? <Text code>{hook ? hook.error.message : error?.message}</Text> : <Title level={3}>{$t('common.errorHint')}</Title>}
      <Button style={{ backgroundColor: theme }} type='primary' onClick={hook ? hook.update : resetErrorBoundary} >{$t('common.tryAlign')}</Button>
    </div>
  );
};

export default ErrorPage;
