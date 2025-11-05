import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Dialog, Portal, Button, Text, IconButton, useTheme } from 'react-native-paper';
import { navigate } from '../../router/navigationRef';
import { formatDateToDDMMYYYY, maskBrazilianCurrency } from '../../utils/app-utils';

interface InadimplenciaDialogProps {
  errors: PessoaAssinaturaInadimplencia[] | null | undefined;
  visible: boolean;
  navigation: any;
  handlePress: (status: boolean) => void;
}

const InadimplenciaDialog = ({ errors, visible, navigation, handlePress }: InadimplenciaDialogProps) => {
  const { colors } = useTheme();
  
  return (
    <Dialog 
      visible={visible} 
      style={[styles.dialog, { backgroundColor: colors.background }]} 
      dismissable 
      onDismiss={() => handlePress(false)}
    >
      <Dialog.Title style={styles.title}>
        <View style={styles.titleContainer}>
          <View style={styles.titleIconContainer}>
            <IconButton
              icon="alert-circle-outline"
              size={24}
              iconColor="#BA1A1A"
              style={styles.titleIcon}
            />
          </View>
          <View style={styles.titleTextContainer}>
            <Text style={styles.titleText}>Pendências Financeiras</Text>
            <Text style={styles.subtitleText}>
              Você possui {errors?.length} parcela{errors?.length !== 1 ? 's' : ''} em aberto
            </Text>
          </View>
        </View>
      </Dialog.Title>
      
      <Dialog.Content>
        <View style={styles.parcelsContainer}>
          <View style={styles.parcelsHeader}>
            <Text style={styles.parcelsHeaderText}>DETALHES DAS PARCELAS</Text>
          </View>
          
          <View style={styles.parcelsList}>
            {errors?.map((e, i) => (
              <View key={i} style={styles.parcelItem}>
                <View style={styles.parcelInfo}>
                  <View style={styles.parcelDateContainer}>
                    <IconButton
                      icon="calendar"
                      size={16}
                      iconColor="#666"
                      style={styles.parcelIcon}
                    />
                    <Text style={styles.parcelDate}>
                      {formatDateToDDMMYYYY(e.data)}
                    </Text>
                  </View>
                  <View style={styles.parcelValueContainer}>
                    
                    <Text style={styles.parcelValue}>
                      {maskBrazilianCurrency(e.valor)}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.warningContainer}>
          <IconButton
            icon="information-outline"
            size={20}
            iconColor="#44005F"
            style={styles.warningIcon}
          />
          <Text style={styles.warningText}>
            Acesse "Meu plano" e regularize sua situação para evitar suspensão do serviço
          </Text>
        </View>
      </Dialog.Content>
      
      <Dialog.Actions style={styles.actions}>
        <Button
          onPress={() => handlePress(false)}
          mode="outlined"
          style={[styles.button, styles.secondaryButton]}
          labelStyle={styles.secondaryButtonLabel}
          contentStyle={styles.buttonContent}
        >
          Deixar para depois
        </Button>
        <Button
          onPress={() => {
            handlePress(false);
            navigate('user-data');
          }}
          mode="contained"
          style={[styles.button, styles.primaryButton]}
          labelStyle={styles.primaryButtonLabel}
          contentStyle={styles.buttonContent}
          icon="arrow-right-circle"
        >
          Regularizar agora
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 16,
    margin: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  title: {
    paddingBottom: 0,
    paddingTop: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  titleIconContainer: {
    marginRight: 12,
  },
  titleIcon: {
    margin: 0,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  titleTextContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  parcelsContainer: {
    marginTop: 8,
  },
  parcelsHeader: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  parcelsHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  parcelsList: {
    maxHeight: 200,
  },
  parcelItem: {
    marginBottom: 8,
  },
  parcelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  parcelDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parcelValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parcelIcon: {
    margin: 0,
    marginRight: 4,
  },
  parcelDate: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  parcelValue: {
    fontSize: 14,
    color: '#44005F',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#44005F',
  },
  warningIcon: {
    margin: 0,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    lineHeight: 18,
  },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 10,
    elevation: 0,
  },
  primaryButton: {
    backgroundColor: '#44005F',
  },
  primaryButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    borderColor: '#666',
    borderWidth: 1,
  },
  secondaryButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  buttonContent: {
    paddingVertical: 6,
  },
});

export default InadimplenciaDialog;