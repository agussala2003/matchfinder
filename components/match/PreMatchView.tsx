import { CitedPlayer } from '@/hooks/useMatchDetails'
import { MatchTabState } from '@/hooks/useMatchScreenState'
import { ChatMessage } from '@/services/chat.service'
import { MatchDetail } from '@/services/matches.service'
import React from 'react'
import { FlatList, View } from 'react-native'
import { EdgeInsets } from 'react-native-safe-area-context'
import { ChatSection } from './ChatSection'
import { DetailsView } from './DetailsView'
import { LineupView } from './LineupView'
import { MatchHeader } from './MatchHeader'
import { MatchTabs } from './MatchTabs'

interface TeamSummary {
  id: string
  name: string
  logo_url?: string
}

interface PreMatchViewProps {
  match: MatchDetail
  myTeam: TeamSummary
  myTeamId: string
  rivalTeam: TeamSummary
  activeTab: MatchTabState
  onTabPress: (tab: MatchTabState) => void
  formatTime: (iso: string) => string
  messages: ChatMessage[]
  flatListRef: React.RefObject<FlatList | null>
  canManage: boolean
  inputText: string
  setInputText: (value: string) => void
  insets: EdgeInsets
  citedPlayers: CitedPlayer[]
  canCancelMatch: () => boolean
  onEditMatch: () => void
  onCancelMatch: () => void
  onSendText: () => void
  onAcceptProposal: (msg: ChatMessage) => Promise<void>
  onRejectProposal: (msg: ChatMessage) => Promise<void>
  onCancelProposal: (msg: ChatMessage) => Promise<void>
  onShowProposalModal: () => void
}

export function PreMatchView({
  match,
  myTeam,
  myTeamId,
  rivalTeam,
  activeTab,
  onTabPress,
  formatTime,
  messages,
  flatListRef,
  canManage,
  inputText,
  setInputText,
  insets,
  citedPlayers,
  canCancelMatch,
  onEditMatch,
  onCancelMatch,
  onSendText,
  onAcceptProposal,
  onRejectProposal,
  onCancelProposal,
  onShowProposalModal,
}: PreMatchViewProps) {
  return (
    <View className='flex-1'>
      <MatchHeader match={match} myTeam={myTeam} rivalTeam={rivalTeam} formatTime={formatTime} />

      <MatchTabs activeTab={activeTab} onTabPress={onTabPress} />

      <View className='flex-1'>
        {activeTab === 'chat' && (
          <ChatSection
            messages={messages}
            flatListRef={flatListRef}
            myTeamId={myTeamId}
            myTeam={myTeam}
            rivalTeam={rivalTeam}
            canManage={canManage}
            inputText={inputText}
            setInputText={setInputText}
            insets={insets}
            onSendText={onSendText}
            onAcceptProposal={onAcceptProposal}
            onRejectProposal={onRejectProposal}
            onCancelProposal={onCancelProposal}
            onShowProposalModal={onShowProposalModal}
          />
        )}

        {activeTab === 'details' && (
          <DetailsView
            match={match}
            canManage={canManage}
            canCancelMatch={canCancelMatch}
            onEditMatch={onEditMatch}
            onCancelMatch={onCancelMatch}
          />
        )}

        {activeTab === 'lineup' && <LineupView citedPlayers={citedPlayers} />}
      </View>
    </View>
  )
}
