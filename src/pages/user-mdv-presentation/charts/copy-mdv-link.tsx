import { Share, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

type Props = {
  id: number;
  codigoPromocional?: string; // valor opcional
};

export default function CopyMdvLink({ id, codigoPromocional }: Props) {
  const { colors } = useTheme();

  const shareMessage = async () => {
    const baseURL = codigoPromocional
      ? `https://fidelidadegees.com.br/${codigoPromocional}`
      : 'https://fidelidadegees.com.br';
    const linkCompartilhado = `${baseURL}/fidelidade-ajudda/planos/${id}`;

    try {
      const result = await Share.share({
        message: linkCompartilhado,
      });

      if (result.action === Share.sharedAction) {
        console.log('Compartilhado com sucesso!');
      } else if (result.action === Share.dismissedAction) {
        console.log('Compartilhamento cancelado.');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  return (
    <View style={{ width: '100%', paddingVertical: 20, borderRadius: 12, padding: 12, overflow: 'hidden', backgroundColor: colors.surface }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.onSurface, marginBottom: 10 }}>
        Link de venda:
      </Text>

      <Button key={'get_all_money'} mode="contained" onPress={shareMessage}>
        Compartilhar link
      </Button>
    </View>
  );
}
