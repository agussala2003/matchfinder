import { ChatMessage } from '@/services/chat.service'
import { Calendar, Lock, Send } from 'lucide-react-native'
import React, { RefObject } from 'react'
import { FlatList, Keyboard, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { ChatMessageItem } from './ChatMessageItem'

interface ChatSectionProps {
  messages: ChatMessage[]
  flatListRef: RefObject<FlatList | null>
  myTeamId: string
  myTeam: any
  rivalTeam: any
  canManage: boolean
  inputText: string
  setInputText: (text: string) => void
  insets: { bottom: number }
  onSendText: () => void
  onAcceptProposal: (msg: ChatMessage) => void
  onRejectProposal: (msg: ChatMessage) => void
  onCancelProposal: (msg: ChatMessage) => void
  onShowProposalModal: () => void
}

export const ChatSection = ({
  messages,
  flatListRef,
  myTeamId,
  myTeam,
  rivalTeam,
  canManage,
  inputText,
  setInputText,
  insets,
  onSendText,
  onAcceptProposal,
  onRejectProposal,
  onCancelProposal,
  onShowProposalModal,
}: ChatSectionProps) => (
  <>
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatMessageItem
          item={item}
          myTeamId={myTeamId}
          myTeam={myTeam}
          rivalTeam={rivalTeam}
          canManage={canManage}
          onAccept={onAcceptProposal}
          onReject={onRejectProposal}
          onCancel={onCancelProposal}
        />
      )}
      inverted
      contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    />

    <View
      className="px-3 py-3 bg-card border-t-2 border-border flex-row items-end gap-3"
      style={{ paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 12) : 12 }}
    >
      {canManage ? (
        <>
          <TouchableOpacity
            onPress={onShowProposalModal}
            className="h-12 w-12 items-center justify-center bg-warning/20 rounded-lg border border-warning/30 active:bg-warning/30"
          >
            <Calendar size={22} color="#EAB308" strokeWidth={2} />
          </TouchableOpacity>

          <TextInput
            className="flex-1 bg-background text-foreground min-h-[48px] max-h-[120px] px-4 py-3 rounded-2xl border-2 border-border focus:border-primary"
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#6B7280"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => {
              onSendText()
              Keyboard.dismiss()
            }}
            returnKeyType="send"
            multiline
            textAlignVertical="center"
            blurOnSubmit={false}
          />

          <TouchableOpacity
            onPress={() => {
              onSendText()
              Keyboard.dismiss()
            }}
            disabled={!inputText.trim()}
            className={`h-12 w-12 items-center justify-center rounded-full ${inputText.trim() ? 'bg-primary active:bg-primary/80' : 'bg-muted'
              }`}
          >
            <Send
              size={20}
              color={inputText.trim() ? '#121217' : '#6B7280'}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </>
      ) : (
        <View className="flex-1 bg-muted/30 px-4 py-3 rounded-2xl border-2 border-dashed border-border flex-row items-center justify-center gap-3">
          <Lock size={16} color="#A1A1AA" />
          <Text className="text-muted-foreground text-xs">
            Solo capitanes pueden negociar y enviar mensajes
          </Text>
        </View>
      )}
    </View>
  </>
)