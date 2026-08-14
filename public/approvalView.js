(function attachApprovalView(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SneupApprovalView = api;
})(typeof window === 'object' ? window : null, function createApprovalViewModule() {
  const DYNAMIC_OPERATOR_MESSAGES = Object.freeze([
    'pending', 'approved', 'rejected', 'change requested', 'snoozed', 'delegated',
    'executing', 'executed', 'failed', 'succeeded', 'in progress', 'awaiting evidence',
    'needs attention', 'not verified', 'delivered', 'digested', 'active', 'paused',
    'due', 'resolved', 'escalated', 'current', 'required', 'warning', 'recorded',
    'open', 'cancelled', 'scheduled', 'unmatched', 'confirmed improved',
    'confirmed succeeded', 'confirmed failed', 'acknowledged', 'completed',
    'blocked', 'needs help', 'ignored', 'yes', 'no', 'review',
    'low', 'medium', 'high', 'critical', 'robert', 'team', 'va', 'operator',
    'external', 'worker', 'overloaded', 'heavy', 'balanced', 'normal', 'light',
    'comment', 'follow up', 'performance notification', 'move card', 'reassign',
    'escalate', 'add label', 'set due date', 'add checklist', 'manual review',
    'comment posted', 'card moved', 'source member removed', 'target member added',
    'reassignment comment posted', 'local card membership synced',
    'escalation comment posted', 'label added', 'due date set', 'checklist created',
    'blocking others', 'card stuck', 'member overloaded', 'no activity',
    'no response to followup', 'overdue', 'external waiting', 'missing next action',
    'robert required', 'stale', 'stuck', 'unassigned', 'va ready',
    'ambiguous request', 'graph blocked work', 'graph overdue work',
    'graph robert review', 'graph unowned work', 'graph waiting follow up',
    'dependency blocker', 'stale card', 'manual request',
    'healthy', 'at risk', 'watch', 'clear', 'unknown', 'action', 'event', 'source',
    'worker response', 'trello action', 'recommendation', 'approval event',
    'board', 'card', 'member', 'info', 'manual', 'email', 'slack', 'slack webhook',
    'web chat', 'Trello comment',
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]);

  const NL_MESSAGES = Object.freeze({
    'Operations ledger needs live data:': 'Het bewerkingenlogboek heeft livegegevens nodig:',
    'Read-only demo ledger. It shows representative approval evidence and never sends provider writes or saves decisions.': 'Alleen-lezen demologboek. Het toont representatief goedkeuringsbewijs en verstuurt nooit providerschrijfacties of beslissingen.',
    'Notification policies are unavailable in the read-only demo ledger.': 'Meldingsbeleid is niet beschikbaar in het alleen-lezen demologboek.',
    'Robert decisions': 'Robert-beslissingen',
    'VA/team queue': 'VA-/teamwachtrij',
    'Awaiting review': 'Wacht op beoordeling',
    'Failed actions': 'Mislukte acties',
    'Reconciliation alerts': 'Afstemmingsmeldingen',
    'Critical evidence gaps': 'Kritieke bewijsleemten',
    'Open findings': 'Open bevindingen',
    'High-risk findings': 'Bevindingen met hoog risico',
    'Overdue follow-ups': 'Achterstallige opvolgingen',
    'Workers needing attention': 'Medewerkers die aandacht nodig hebben',
    'Outcome reviews': 'Uitkomstbeoordelingen',
    'Audit events': 'Auditgebeurtenissen',
    'Recent responses': 'Recente reacties',
    'Approval required': 'Goedkeuring vereist',
    'risk': 'risico',
    'Answer: {answer}': 'Antwoord: {answer}',
    'Snooze 24h': '24 uur uitstellen',
    'Delegate team': 'Aan team delegeren',
    'Delegate VA': 'Aan VA delegeren',
    '{count}% confidence': '{count}% betrouwbaarheid',
    '{count} evidence item': '{count} bewijsitem',
    '{count} evidence items': '{count} bewijsitems',
    'Review the exact payload before action.': 'Beoordeel de exacte payload vóór de actie.',
    'Exact action payload': 'Exacte actiepayload',
    'Evidence bundle': 'Bewijsbundel',
    'Execute approved': 'Goedgekeurde actie uitvoeren',
    'Yes': 'Ja',
    'No': 'Nee',
    'Change': 'Wijzigen',
    'Review payload': 'Payload beoordelen',
    'Board': 'Bord',
    'Card': 'Kaart',
    'Waiting on {owner}': 'Wacht op {owner}',
    '{count}/100 signal': '{count}/100 signaal',
    'Review finding': 'Bevinding beoordelen',
    'Board health': 'Bordstatus',
    '{count}/100 health': '{count}/100 status',
    '{count} VA-ready': '{count} VA-gereed',
    'No summary recorded': 'Geen samenvatting vastgelegd',
    'No error recorded': 'Geen fout vastgelegd',
    'Attempt payload': 'Pogingspayload',
    'Confirmed: {steps}': 'Bevestigd: {steps}',
    'Check: {steps}': 'Controleren: {steps}',
    'Reconcile result': 'Resultaat afstemmen',
    'Reconciliation coverage': 'Afstemmingsdekking',
    '{count} unresolved claim': '{count} onopgeloste claim',
    '{count} unresolved claims': '{count} onopgeloste claims',
    'Evidence warning at {hours}h': 'Bewijswaarschuwing na {hours} uur',
    'Reconciliation attention': 'Afstemming vereist aandacht',
    '{critical} critical, {warning} warning': '{critical} kritiek, {warning} waarschuwing',
    'Confirm the observed provider result in the matching action below.': 'Bevestig het waargenomen providerresultaat bij de overeenkomende actie hieronder.',
    'Thresholds: {warning}h / {critical}h': 'Drempels: {warning} uur / {critical} uur',
    'Unlabelled destination': 'Bestemming zonder label',
    '{severity} and above': '{severity} en hoger',
    'Encrypted destination configured': 'Versleutelde bestemming ingesteld',
    'Destination needs configuration': 'Bestemming moet worden ingesteld',
    'Warning alerts defer {start}:00-{end}:00 UTC': 'Waarschuwingsmeldingen uitstellen van {start}:00-{end}:00 UTC',
    'No quiet hours': 'Geen stille uren',
    'Warning digest at {hour}:00 UTC, up to {count} items': 'Waarschuwingsoverzicht om {hour}:00 UTC, maximaal {count} items',
    'Warning alerts deliver individually': 'Waarschuwingsmeldingen afzonderlijk afleveren',
    'Daily operations brief at {hour}:00 UTC': 'Dagelijkse bewerkingensamenvatting om {hour}:00 UTC',
    'Weekly status every {day} at {hour}:00 UTC': 'Wekelijkse status elke {day} om {hour}:00 UTC',
    'No scheduled brief or report': 'Geen geplande samenvatting of rapportage',
    'Edit': 'Bewerken',
    'Pause': 'Pauzeren',
    'Activate': 'Activeren',
    'Send test': 'Test verzenden',
    'Alert scheduler': 'Meldingsplanner',
    'Report scheduler': 'Rapportageplanner',
    'Daily brief scheduler': 'Planner dagelijkse samenvatting',
    '{label}: {status}, last run {date}': '{label}: {status}, laatst uitgevoerd {date}',
    '{label}: health unavailable': '{label}: status niet beschikbaar',
    'Notification delivery': 'Meldingsaflevering',
    'Notification policy': 'Meldingsbeleid',
    'Delivery recorded': 'Aflevering vastgelegd',
    'Source details': 'Brondetails',
    'Open source evidence': 'Bronbewijs openen',
    'Follow-up needed': 'Opvolging nodig',
    'Due {date}': 'Vervalt {date}',
    'Review worker response': 'Reactie van medewerker beoordelen',
    'Record response': 'Reactie vastleggen',
    'Resolved': 'Opgelost',
    'Escalate': 'Escaleren',
    'No follow-ups in window': 'Geen opvolgingen in deze periode',
    '{count}% response coverage': '{count}% reactiedekking',
    'Unknown member': 'Onbekende medewerker',
    '{level} workload': '{level} werkbelasting',
    '{count} follow-up': '{count} opvolging',
    '{count} follow-ups': '{count} opvolgingen',
    '{count} response': '{count} reactie',
    '{count} responses': '{count} reacties',
    '{count} escalated': '{count} geëscaleerd',
    '{count} explicitly ignored': '{count} expliciet genegeerd',
    '{action} outcome': 'Uitkomst van {action}',
    'Checked {date}': 'Gecontroleerd {date}',
    'Outcome evidence is pending.': 'Uitkomstbewijs is nog niet beschikbaar.',
    'Refresh evidence': 'Bewijs vernieuwen',
    'Ledger event': 'Logboekgebeurtenis',
    'Source evidence': 'Bronbewijs',
    '+{count} more': '+{count} meer',
    'Evidence': 'Bewijs',
    '{type} evidence': '{type}-bewijs',
    'Worker accountability needs ledger access.': 'Medewerkersverantwoording heeft toegang tot het logboek nodig.',
    '{count} pending': '{count} in afwachting',
    '{count} open': '{count} open',
    '{count} recent': '{count} recent',
    '{count} snapshot': '{count} momentopname',
    '{count} snapshots': '{count} momentopnamen',
    '{count} attempt': '{count} poging',
    '{count} attempts': '{count} pogingen',
    '{count} needs evidence': '{count} heeft bewijs nodig',
    '{count} need evidence': '{count} hebben bewijs nodig',
    '{count} policy': '{count} beleid',
    '{count} policies': '{count} beleidsregels',
    '{count} due': '{count} verschuldigd',
    '{count} review': '{count} beoordeling',
    '{count} reviews': '{count} beoordelingen',
    'approved': 'goedgekeurd',
    'rejected': 'afgewezen',
    'change requested': 'wijziging gevraagd',
    'snoozed': 'uitgesteld',
    'delegated': 'gedelegeerd',
    'executing': 'wordt uitgevoerd',
    'executed': 'uitgevoerd',
    'succeeded': 'geslaagd',
    'in progress': 'bezig',
    'awaiting evidence': 'wacht op bewijs',
    'not verified': 'niet geverifieerd',
    'delivered': 'afgeleverd',
    'digested': 'gebundeld',
    'due': 'verschuldigd',
    'resolved': 'opgelost',
    'escalated': 'geëscaleerd',
    'required': 'vereist',
    'warning': 'waarschuwing',
    'recorded': 'vastgelegd',
    'open': 'open',
    'cancelled': 'geannuleerd',
    'scheduled': 'gepland',
    'unmatched': 'niet gekoppeld',
    'confirmed improved': 'verbetering bevestigd',
    'confirmed succeeded': 'succes bevestigd',
    'confirmed failed': 'mislukking bevestigd',
    'acknowledged': 'bevestigd',
    'completed': 'voltooid',
    'blocked': 'geblokkeerd',
    'needs help': 'heeft hulp nodig',
    'ignored': 'genegeerd',
    'yes': 'ja',
    'no': 'nee',
    'external': 'extern',
    'worker': 'medewerker',
    'normal': 'normaal',
    'comment': 'opmerking',
    'follow up': 'opvolging',
    'performance notification': 'prestatiemelding',
    'move card': 'kaart verplaatsen',
    'reassign': 'opnieuw toewijzen',
    'escalate': 'escaleren',
    'add label': 'label toevoegen',
    'set due date': 'vervaldatum instellen',
    'add checklist': 'checklist toevoegen',
    'manual review': 'handmatige beoordeling',
    'comment posted': 'reactie geplaatst',
    'card moved': 'kaart verplaatst',
    'source member removed': 'vorige eigenaar verwijderd',
    'target member added': 'nieuwe eigenaar toegevoegd',
    'reassignment comment posted': 'reactie over hertoewijzing geplaatst',
    'local card membership synced': 'lokale kaarteigenaren gesynchroniseerd',
    'escalation comment posted': 'escalatiereactie geplaatst',
    'label added': 'label toegevoegd',
    'due date set': 'vervaldatum ingesteld',
    'checklist created': 'checklist aangemaakt',
    'Checklist item {count} created': 'Checklistitem {count} aangemaakt',
    'blocking others': 'blokkeert anderen',
    'card stuck': 'kaart zit vast',
    'member overloaded': 'medewerker overbelast',
    'no activity': 'geen activiteit',
    'no response to followup': 'geen reactie op opvolging',
    'overdue': 'te laat',
    'external waiting': 'wacht extern',
    'missing next action': 'volgende actie ontbreekt',
    'robert required': 'Robert vereist',
    'stale': 'verouderd',
    'stuck': 'vastgelopen',
    'unassigned': 'niet toegewezen',
    'va ready': 'VA-gereed',
    'ambiguous request': 'onduidelijk verzoek',
    'graph blocked work': 'geblokkeerd werk in de werkgraaf',
    'graph overdue work': 'te laat werk in de werkgraaf',
    'graph robert review': 'Robert-beoordeling uit de werkgraaf',
    'graph unowned work': 'werk zonder eigenaar in de werkgraaf',
    'graph waiting follow up': 'werkgraaf wacht op opvolging',
    'dependency blocker': 'afhankelijkheidsblokkade',
    'stale card': 'verouderde kaart',
    'manual request': 'handmatig verzoek',
    'at risk': 'risico',
    'watch': 'volgen',
    'clear': 'in orde',
    'unknown': 'onbekend',
    'action': 'actie',
    'event': 'gebeurtenis',
    'source': 'bron',
    'worker response': 'medewerkersreactie',
    'trello action': 'Trello-actie',
    'recommendation': 'aanbeveling',
    'approval event': 'goedkeuringsgebeurtenis',
    'board': 'bord',
    'card': 'kaart',
    'info': 'informatie',
    'manual': 'handmatig',
    'email': 'e-mail',
    'slack': 'Slack',
    'slack webhook': 'Slack-webhook',
    'web chat': 'webchat',
    'Trello comment': 'Trello-opmerking',
    'Sunday': 'zondag',
    'Monday': 'maandag',
    'Tuesday': 'dinsdag',
    'Wednesday': 'woensdag',
    'Thursday': 'donderdag',
    'Friday': 'vrijdag',
    'Saturday': 'zaterdag',
    'Action completed: {action}': 'Actie voltooid: {action}',
    'Recommendation updated': 'Aanbeveling bijgewerkt',
    'Recommendation action failed': 'Aanbevelingsactie mislukt',
    'Decision updated': 'Beslissing bijgewerkt',
    'Decision update failed': 'Beslissing bijwerken mislukt',
    'Decision snoozed using this workspace default.': 'Beslissing uitgesteld volgens de standaard van deze werkruimte.',
    'Decision delegated.': 'Beslissing gedelegeerd.',
    'Follow-up updated': 'Opvolging bijgewerkt',
    'Follow-up update failed': 'Opvolging bijwerken mislukt',
    'Follow-up escalated.': 'Opvolging geëscaleerd.',
    'Follow-up resolved.': 'Opvolging opgelost.',
    'Record worker response': 'Reactie van medewerker vastleggen',
    'Record an observed response to the executed communication. Sneup will update the matching internal follow-up and accountability ledger, but it will not send a provider message.': 'Leg een waargenomen reactie op de uitgevoerde communicatie vast. Sneup werkt de bijbehorende interne opvolging en het verantwoordingslogboek bij, maar verstuurt geen providerbericht.',
    'Response type': 'Reactietype',
    'Acknowledged': 'Bevestigd',
    'Completed': 'Voltooid',
    'Blocked': 'Geblokkeerd',
    'Needs help': 'Hulp nodig',
    'Ignored': 'Genegeerd',
    'Other': 'Anders',
    'Observed through': 'Waargenomen via',
    'Manual observation': 'Handmatige waarneming',
    'Email': 'E-mail',
    'Slack': 'Slack',
    'Web chat': 'Webchat',
    'Response note (optional)': 'Reactienotitie (optioneel)',
    'Record only the context needed to explain the response': 'Leg alleen de context vast die nodig is om de reactie toe te lichten',
    'Cancel': 'Annuleren',
    'Recording...': 'Vastleggen...',
    'Worker response recorded': 'Reactie van medewerker vastgelegd',
    'Worker response blocked': 'Reactie van medewerker geblokkeerd',
    'The matching follow-up was escalated for review.': 'De bijbehorende opvolging is ter beoordeling geëscaleerd.',
    'The matching follow-up and accountability ledger were updated.': 'De bijbehorende opvolging en het verantwoordingslogboek zijn bijgewerkt.',
    'Payload review unavailable': 'Payloadbeoordeling niet beschikbaar',
    'Review {action} payload': 'Payload voor {action} beoordelen',
    'The Trello target and action type are locked. Saving changes returns this recommendation to pending so the exact revised payload must be approved again.': 'Het Trello-doel en actietype zijn vergrendeld. Na opslaan gaat deze aanbeveling terug naar in afwachting, zodat de exact gewijzigde payload opnieuw moet worden goedgekeurd.',
    'Sneup needs the current board members or lists before this payload can be prepared.': 'Sneup heeft de huidige bordleden of lijsten nodig voordat deze payload kan worden voorbereid.',
    'Save for approval': 'Opslaan voor goedkeuring',
    'Payload saved': 'Payload opgeslagen',
    'Payload update failed': 'Payload bijwerken mislukt',
    'The revised action is pending a fresh Yes/No approval.': 'De gewijzigde actie wacht op een nieuwe Ja/Nee-goedkeuring.',
    'This recommendation does not have a board target to verify.': 'Deze aanbeveling heeft geen borddoel om te verifiëren.',
    'Comment text': 'Opmerkingstekst',
    'Follow-up text': 'Opvolgingstekst',
    'Notification text': 'Meldingstekst',
    'Target Trello list': 'Doel-Trello-lijst',
    'New accountable owner': 'Nieuwe verantwoordelijke eigenaar',
    'Optional reassignment note': 'Optionele notitie bij hertoewijzing',
    'Escalation text': 'Escalatietekst',
    'Label name': 'Labelnaam',
    'Label color': 'Labelkleur',
    'Due date (ISO 8601)': 'Vervaldatum (ISO 8601)',
    'Checklist name': 'Checklistnaam',
    'Checklist items (one per line)': 'Checklistitems (één per regel)',
    'Current owner': 'Huidige eigenaar',
    'Source': 'Bron',
    'yellow': 'geel',
    'purple': 'paars',
    'blue': 'blauw',
    'red': 'rood',
    'green': 'groen',
    'orange': 'oranje',
    'black': 'zwart',
    'sky': 'hemelsblauw',
    'pink': 'roze',
    'lime': 'limoengroen',
    'Evidence unavailable': 'Bewijs niet beschikbaar',
    'Recommendation evidence': 'Aanbevelingsbewijs',
    'Recommendation': 'Aanbeveling',
    '{count} source ref': '{count} bronverwijzing',
    '{count} source refs': '{count} bronverwijzingen',
    '{count} approval': '{count} goedkeuring',
    '{count} approvals': '{count} goedkeuringen',
    '{count} Trello attempt': '{count} Trello-poging',
    '{count} Trello attempts': '{count} Trello-pogingen',
    '{count} audit event': '{count} auditgebeurtenis',
    '{count} audit events': '{count} auditgebeurtenissen',
    'Newest {date}': 'Nieuwste {date}',
    'Source Evidence': 'Bronbewijs',
    'Trello Action Evidence': 'Trello-actiebewijs',
    'Notification sources': 'Meldingsbronnen',
    'This delivery has no validated source links.': 'Deze aflevering heeft geen gevalideerde bronlinks.',
    'Open source': 'Bron openen',
    'Evidence data': 'Bewijsgegevens',
    'Audit event': 'Auditgebeurtenis',
    'Reconcile {action}': '{action} afstemmen',
    "Confirm the observed provider result. This finalizes Sneup's ledger and does not send another Trello request.": 'Bevestig het waargenomen providerresultaat. Dit voltooit het Sneup-logboek en verstuurt geen nieuw Trello-verzoek.',
    'Observed result': 'Waargenomen resultaat',
    'Select result': 'Resultaat selecteren',
    'Succeeded in Trello': 'Geslaagd in Trello',
    'Did not succeed in Trello': 'Niet geslaagd in Trello',
    'Evidence checked': 'Gecontroleerd bewijs',
    'Trello activity, card state, or provider error reviewed': 'Beoordeelde Trello-activiteit, kaartstatus of providerfout',
    'Resolution note': 'Afstemmingsnotitie',
    'Optional decision note': 'Optionele beslisnotitie',
    'Finalize ledger': 'Logboek voltooien',
    'Finalizing...': 'Voltooien...',
    'Ledger reconciled': 'Logboek afgestemd',
    'Reconciliation blocked': 'Afstemming geblokkeerd',
    'The provider result is finalized. Audit recording needs operator review.': 'Het providerresultaat is voltooid. De auditregistratie vereist beoordeling door een beheerder.',
    'The provider result and approval ledger are finalized.': 'Het providerresultaat en goedkeuringslogboek zijn voltooid.',
    'Edit delivery policy': 'Afleverbeleid bewerken',
    'Add delivery policy': 'Afleverbeleid toevoegen',
    'Name': 'Naam',
    'Operations alerts': 'Bewerkingsmeldingen',
    'Deliver': 'Afleveren',
    'Weekly status report': 'Wekelijks statusrapport',
    'Daily operations brief': 'Dagelijkse bewerkingensamenvatting',
    'Channel': 'Kanaal',
    'Slack webhook': 'Slack-webhook',
    'Teams webhook': 'Teams-webhook',
    'Generic webhook': 'Algemene webhook',
    'Email (Resend)': 'E-mail (Resend)',
    'Destination label': 'Bestemmingslabel',
    'Project operations channel': 'Kanaal voor projectbewerkingen',
    'HTTPS webhook URL': 'HTTPS-webhook-URL',
    'Email recipient': 'E-mailontvanger',
    'Encrypted destination retained unless you enter a replacement.': 'De versleutelde bestemming blijft behouden tenzij u een vervanging invoert.',
    'Minimum severity': 'Minimale ernst',
    'Warning and critical': 'Waarschuwing en kritiek',
    'Critical only': 'Alleen kritiek',
    'Defer warning alerts during quiet hours (critical alerts stay immediate)': 'Waarschuwingsmeldingen tijdens stille uren uitstellen (kritieke meldingen blijven direct)',
    'Quiet start UTC': 'Begin stille uren UTC',
    'Quiet end UTC': 'Einde stille uren UTC',
    'Send warning evidence as one daily digest (critical alerts stay immediate)': 'Waarschuwingsbewijs als één dagelijks overzicht verzenden (kritieke meldingen blijven direct)',
    'Digest hour UTC': 'Overzichtsuur UTC',
    'Maximum digest items': 'Maximaal aantal overzichtsitems',
    'Weekly day UTC': 'Wekelijkse dag UTC',
    'Delivery hour UTC': 'Afleveruur UTC',
    'Daily delivery hour UTC': 'Dagelijks afleveruur UTC',
    'The daily brief is read-only: it summarizes current decisions, risks, follow-ups, and the morning plan. It never changes a provider account.': 'De dagelijkse samenvatting is alleen-lezen: deze vat huidige beslissingen, risico’s, opvolgingen en het ochtendplan samen. Een provideraccount wordt nooit gewijzigd.',
    'Changes keep this policy {status}. Activation remains a separate confirmation.': 'Wijzigingen houden dit beleid {status}. Activering blijft een afzonderlijke bevestiging.',
    'The policy starts paused. Activate it separately when this workspace is ready to deliver its configured alerts, daily brief, or weekly status report.': 'Het beleid begint gepauzeerd. Activeer het afzonderlijk wanneer deze werkruimte gereed is om de ingestelde meldingen, dagelijkse samenvatting of wekelijkse status te leveren.',
    'Save paused policy': 'Gepauzeerd beleid opslaan',
    'Select at least one delivery type': 'Selecteer ten minste één afleveringstype',
    'Saving...': 'Opslaan...',
    'Policy not saved': 'Beleid niet opgeslagen',
    'Policy update blocked': 'Beleidswijziging geblokkeerd',
    'Policy saved': 'Beleid opgeslagen',
    'The paused delivery policy is saved with audit evidence.': 'Het gepauzeerde afleverbeleid is opgeslagen met auditbewijs.',
    'The delivery policy changes are saved with audit evidence.': 'De wijzigingen in het afleverbeleid zijn opgeslagen met auditbewijs.',
    'Policy paused': 'Beleid gepauzeerd',
    'The delivery policy is paused with audit evidence.': 'Het afleverbeleid is gepauzeerd met auditbewijs.',
    'Policy activated': 'Beleid geactiveerd',
    'The delivery policy is active with audit evidence.': 'Het afleverbeleid is actief met auditbewijs.',
    'The policy change was saved, but the operations ledger could not refresh. Reopen Approvals to load the latest state.': 'De beleidswijziging is opgeslagen, maar het bewerkingenlogboek kon niet worden vernieuwd. Open Goedkeuringen opnieuw om de nieuwste status te laden.',
    'Activate delivery policy': 'Afleverbeleid activeren',
    '{severity} reconciliation evidence alerts': '{severity} afstemmingsmeldingen voor bewijs',
    'weekly status reports': 'wekelijkse statusrapporten',
    'daily operations briefs': 'dagelijkse bewerkingensamenvattingen',
    'Activating': 'Activering van',
    'permits {deliveries} to': 'staat {deliveries} toe naar',
    'and': 'en',
    'configured deliveries': 'ingestelde afleveringen',
    'the configured destination': 'de ingestelde bestemming',
    'I confirm this workspace may deliver these notifications.': 'Ik bevestig dat deze werkruimte deze meldingen mag afleveren.',
    'Activate policy': 'Beleid activeren',
    'Activating...': 'Activeren...',
    'Send test alert': 'Testmelding verzenden',
    'This sends a real test delivery to': 'Dit verstuurt een echte testaflevering naar',
    'It does not activate the policy.': 'Dit activeert het beleid niet.',
    'I understand this sends an external test notification.': 'Ik begrijp dat dit een externe testmelding verstuurt.',
    'Sending...': 'Verzenden...',
    'Test delivered': 'Test afgeleverd',
    'Test delivery failed': 'Testaflevering mislukt',
    'The external destination accepted the test alert.': 'De externe bestemming heeft de testmelding geaccepteerd.',
    'The test was delivered, but the operations ledger could not refresh. Reopen Approvals to load the latest evidence.': 'De test is afgeleverd, maar het bewerkingenlogboek kon niet worden vernieuwd. Open Goedkeuringen opnieuw om het nieuwste bewijs te laden.',
  });

  function createController(context = {}) {
    const {
      document,
      window,
      state,
      elements,
      callbacks,
      t,
      plural,
      escapeHtml,
      formatDate,
      severityClass,
      getId,
      canEditPayload
    } = context;
    if (!document || !state || !elements || !callbacks || !t || !plural || !getId) {
      throw new TypeError('Approval view requires document, state, elements, callbacks, and localization');
    }

    const et = (message, params) => escapeHtml(t(message, params));
    const ep = (singular, pluralMessage, count, params) => escapeHtml(plural(singular, pluralMessage, count, params));
    const semantic = (value, fallback = '') => t(String(value || fallback).replaceAll('_', ' '));
    const es = (value, fallback = '') => escapeHtml(semantic(value, fallback));
    const fd = (value) => {
      if (!value) return t('No date');
      try {
        return formatDate(value);
      } catch (error) {
        return t('No date');
      }
    };
    const unique = values => [...new Set(values.filter(Boolean))];
    const listOrEmpty = (items, renderer) => items && items.length > 0
      ? items.map(renderer).join('')
      : `<div class="empty">${et('Nothing needs attention.')}</div>`;
    const browserWindow = window || document.defaultView;
    const pendingPolicyActions = new Set();

    async function refreshAfterPolicyCommit(successTitle, successMessage, refreshFailureMessage) {
      try {
        await callbacks.loadOperationsLedger();
        callbacks.openNotice(t(successTitle), t(successMessage));
      } catch (error) {
        callbacks.openNotice(t(successTitle), t(refreshFailureMessage));
      }
    }

    function notificationPolicyDraft(form, eventTypeInputs) {
      const values = Object.fromEntries(new browserWindow.FormData(form).entries());
      return {
        name: String(values.name || ''),
        channel: String(values.channel || ''),
        destinationLabel: String(values.destinationLabel || ''),
        destinationValue: String(form.elements[values.channel === 'email' ? 'destinationEmail' : 'destinationUrl'].value || '').trim(),
        minimumSeverity: String(values.minimumSeverity || 'warning'),
        eventTypes: eventTypeInputs.filter(input => input.checked).map(input => input.value),
        quietHoursEnabled: form.elements.quietHoursEnabled.checked,
        quietStartHourUtc: Number(form.elements.quietStartHourUtc.value),
        quietEndHourUtc: Number(form.elements.quietEndHourUtc.value),
        digestEnabled: form.elements.digestEnabled.checked,
        digestHourUtc: Number(form.elements.digestHourUtc.value),
        digestMaximumItems: Number(form.elements.digestMaximumItems.value),
        reportDayOfWeekUtc: Number(form.elements.reportDayOfWeekUtc.value),
        reportHourUtc: Number(form.elements.reportHourUtc.value),
        dailyBriefHourUtc: Number(form.elements.dailyBriefHourUtc.value)
      };
    }

    function openNotificationPolicyForm(policy = null) {
      if (state.ledger?.demoMode || !elements.modal || !elements.modalTitle || !elements.modalBody) return false;
      const isEdit = Boolean(policy);
      const eventTypes = policy?.eventTypes?.length ? policy.eventTypes : ['reconciliation_alert'];
      const quietHours = policy?.quietHours || { enabled: false, startHourUtc: 18, endHourUtc: 8 };
      const digest = policy?.digest || { enabled: false, hourUtc: 9, maximumItems: 10 };
      const reportSchedule = policy?.reportSchedule || { dayOfWeekUtc: 1, hourUtc: 9 };
      const dailyBriefSchedule = policy?.dailyBriefSchedule || { hourUtc: 8 };
      const channel = policy?.channel || 'slack_webhook';
      elements.modalTitle.textContent = t(isEdit ? 'Edit delivery policy' : 'Add delivery policy');
      elements.modalBody.innerHTML = `
        <form id="notificationPolicyForm" class="notice-stack">
          <label>${et('Name')}<input name="name" type="text" maxlength="120" required value="${escapeHtml(policy?.name || '')}" placeholder="${et('Operations alerts')}"></label>
          <fieldset class="notice-stack">
            <legend>${et('Deliver')}</legend>
            <label><input name="eventTypes" type="checkbox" value="reconciliation_alert" ${eventTypes.includes('reconciliation_alert') ? 'checked' : ''}> ${et('Reconciliation alerts')}</label>
            <label><input name="eventTypes" type="checkbox" value="weekly_status_report" ${eventTypes.includes('weekly_status_report') ? 'checked' : ''}> ${et('Weekly status report')}</label>
            <label><input name="eventTypes" type="checkbox" value="daily_operations_brief" ${eventTypes.includes('daily_operations_brief') ? 'checked' : ''}> ${et('Daily operations brief')}</label>
          </fieldset>
          <label>${et('Channel')}
            <select name="channel" required>
              <option value="slack_webhook" ${channel === 'slack_webhook' ? 'selected' : ''}>${et('Slack webhook')}</option>
              <option value="teams_webhook" ${channel === 'teams_webhook' ? 'selected' : ''}>${et('Teams webhook')}</option>
              <option value="generic_webhook" ${channel === 'generic_webhook' ? 'selected' : ''}>${et('Generic webhook')}</option>
              <option value="email" ${channel === 'email' ? 'selected' : ''}>${et('Email (Resend)')}</option>
            </select>
          </label>
          <label>${et('Destination label')}<input name="destinationLabel" type="text" maxlength="160" required value="${escapeHtml(policy?.destinationLabel || '')}" placeholder="${et('Project operations channel')}"></label>
          <label id="notificationWebhookDestination">${et('HTTPS webhook URL')}<input name="destinationUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://..."></label>
          <label id="notificationEmailDestination" hidden>${et('Email recipient')}<input name="destinationEmail" type="email" inputmode="email" autocomplete="email" placeholder="operations@example.com"></label>
          ${isEdit && policy.destinationConfigured ? `<div class="notice">${et('Encrypted destination retained unless you enter a replacement.')}</div>` : ''}
          <div id="notificationAlertSettings">
            <label>${et('Minimum severity')}
              <select name="minimumSeverity">
                <option value="warning" ${policy?.minimumSeverity !== 'critical' ? 'selected' : ''}>${et('Warning and critical')}</option>
                <option value="critical" ${policy?.minimumSeverity === 'critical' ? 'selected' : ''}>${et('Critical only')}</option>
              </select>
            </label>
            <label><input name="quietHoursEnabled" type="checkbox" ${quietHours.enabled ? 'checked' : ''}> ${et('Defer warning alerts during quiet hours (critical alerts stay immediate)')}</label>
            <div class="form-grid">
              <label>${et('Quiet start UTC')}<input name="quietStartHourUtc" type="number" min="0" max="23" value="${escapeHtml(quietHours.startHourUtc)}"></label>
              <label>${et('Quiet end UTC')}<input name="quietEndHourUtc" type="number" min="0" max="23" value="${escapeHtml(quietHours.endHourUtc)}"></label>
            </div>
            <label><input name="digestEnabled" type="checkbox" ${digest.enabled ? 'checked' : ''}> ${et('Send warning evidence as one daily digest (critical alerts stay immediate)')}</label>
            <div class="form-grid">
              <label>${et('Digest hour UTC')}<input name="digestHourUtc" type="number" min="0" max="23" value="${escapeHtml(digest.hourUtc)}"></label>
              <label>${et('Maximum digest items')}<input name="digestMaximumItems" type="number" min="1" max="25" value="${escapeHtml(digest.maximumItems)}"></label>
            </div>
          </div>
          <div id="notificationReportSettings" hidden>
            <div class="form-grid">
              <label>${et('Weekly day UTC')}
                <select name="reportDayOfWeekUtc">
                  <option value="1" ${Number(reportSchedule.dayOfWeekUtc) === 1 ? 'selected' : ''}>${et('Monday')}</option><option value="2" ${Number(reportSchedule.dayOfWeekUtc) === 2 ? 'selected' : ''}>${et('Tuesday')}</option><option value="3" ${Number(reportSchedule.dayOfWeekUtc) === 3 ? 'selected' : ''}>${et('Wednesday')}</option><option value="4" ${Number(reportSchedule.dayOfWeekUtc) === 4 ? 'selected' : ''}>${et('Thursday')}</option><option value="5" ${Number(reportSchedule.dayOfWeekUtc) === 5 ? 'selected' : ''}>${et('Friday')}</option><option value="6" ${Number(reportSchedule.dayOfWeekUtc) === 6 ? 'selected' : ''}>${et('Saturday')}</option><option value="0" ${Number(reportSchedule.dayOfWeekUtc) === 0 ? 'selected' : ''}>${et('Sunday')}</option>
                </select>
              </label>
              <label>${et('Delivery hour UTC')}<input name="reportHourUtc" type="number" min="0" max="23" value="${escapeHtml(reportSchedule.hourUtc)}"></label>
            </div>
          </div>
          <div id="notificationDailyBriefSettings" hidden>
            <div class="form-grid"><label>${et('Daily delivery hour UTC')}<input name="dailyBriefHourUtc" type="number" min="0" max="23" value="${escapeHtml(dailyBriefSchedule.hourUtc)}"></label></div>
            <div class="notice">${et('The daily brief is read-only: it summarizes current decisions, risks, follow-ups, and the morning plan. It never changes a provider account.')}</div>
          </div>
          <div class="notice">${isEdit
    ? et('Changes keep this policy {status}. Activation remains a separate confirmation.', { status: t(String(policy.status).replaceAll('_', ' ')) })
    : et('The policy starts paused. Activate it separately when this workspace is ready to deliver its configured alerts, daily brief, or weekly status report.')}</div>
          <div class="toolbar modal-actions">
            <button class="button" type="button" id="cancelNotificationPolicy">${et('Cancel')}</button>
            <button class="button primary" type="submit">${et(isEdit ? 'Save changes' : 'Save paused policy')}</button>
          </div>
        </form>
      `;
      elements.modal.classList.add('open');
      document.getElementById('cancelNotificationPolicy').addEventListener('click', callbacks.closeModal);
      const form = document.getElementById('notificationPolicyForm');
      const channelInput = form.elements.channel;
      const eventTypeInputs = [...form.querySelectorAll('input[name="eventTypes"]')];
      const webhookDestination = document.getElementById('notificationWebhookDestination');
      const emailDestination = document.getElementById('notificationEmailDestination');
      const alertSettings = document.getElementById('notificationAlertSettings');
      const reportSettings = document.getElementById('notificationReportSettings');
      const dailyBriefSettings = document.getElementById('notificationDailyBriefSettings');
      const syncDestinationInput = () => {
        const emailSelected = channelInput.value === 'email';
        const retainsDestination = isEdit && policy.destinationConfigured && channelInput.value === policy.channel;
        webhookDestination.hidden = emailSelected;
        emailDestination.hidden = !emailSelected;
        form.elements.destinationUrl.required = !emailSelected && !retainsDestination;
        form.elements.destinationEmail.required = emailSelected && !retainsDestination;
      };
      const syncEventSettings = () => {
        const selected = eventTypeInputs.filter(input => input.checked).map(input => input.value);
        alertSettings.hidden = !selected.includes('reconciliation_alert');
        reportSettings.hidden = !selected.includes('weekly_status_report');
        dailyBriefSettings.hidden = !selected.includes('daily_operations_brief');
        eventTypeInputs[0].setCustomValidity(selected.length ? '' : t('Select at least one delivery type'));
      };
      channelInput.addEventListener('change', syncDestinationInput);
      eventTypeInputs.forEach(input => input.addEventListener('change', syncEventSettings));
      syncDestinationInput();
      syncEventSettings();
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton.disabled) return;
        submitButton.disabled = true;
        submitButton.textContent = t('Saving...');
        try {
          await callbacks.saveNotificationPolicy(isEdit ? getId(policy.id || policy._id) : '', notificationPolicyDraft(form, eventTypeInputs));
        } catch (error) {
          submitButton.disabled = false;
          submitButton.textContent = t(isEdit ? 'Save changes' : 'Save paused policy');
          callbacks.openNotice(t('Policy not saved'), error.message);
          return;
        }
        callbacks.closeModal();
        await refreshAfterPolicyCommit(
          'Policy saved',
          isEdit ? 'The delivery policy changes are saved with audit evidence.' : 'The paused delivery policy is saved with audit evidence.',
          'The policy change was saved, but the operations ledger could not refresh. Reopen Approvals to load the latest state.'
        );
      });
      return true;
    }

    async function updateNotificationPolicyStatus(policy, status, trigger, options = {}) {
      const policyId = getId(policy?.id || policy?._id);
      const actionKey = `${policyId}:${status}`;
      if (!policyId || pendingPolicyActions.has(actionKey)) return false;
      pendingPolicyActions.add(actionKey);
      if (trigger) trigger.disabled = true;
      try {
        await callbacks.setNotificationPolicyStatus(policyId, status);
      } catch (error) {
        pendingPolicyActions.delete(actionKey);
        if (trigger) trigger.disabled = false;
        callbacks.openNotice(t('Policy update blocked'), error.message);
        return false;
      }
      pendingPolicyActions.delete(actionKey);
      if (options.closeOnCommit) callbacks.closeModal();
      await refreshAfterPolicyCommit(
        status === 'active' ? 'Policy activated' : 'Policy paused',
        status === 'active' ? 'The delivery policy is active with audit evidence.' : 'The delivery policy is paused with audit evidence.',
        'The policy change was saved, but the operations ledger could not refresh. Reopen Approvals to load the latest state.'
      );
      return true;
    }

    function openNotificationActivation(policy) {
      if (!policy || state.ledger?.demoMode || !elements.modal || !elements.modalTitle || !elements.modalBody) return false;
      const eventLabels = [];
      if ((policy.eventTypes || []).includes('reconciliation_alert')) eventLabels.push(t('{severity} reconciliation evidence alerts', { severity: t(policy.minimumSeverity) }));
      if ((policy.eventTypes || []).includes('weekly_status_report')) eventLabels.push(t('weekly status reports'));
      if ((policy.eventTypes || []).includes('daily_operations_brief')) eventLabels.push(t('daily operations briefs'));
      elements.modalTitle.textContent = t('Activate delivery policy');
      elements.modalBody.innerHTML = `
        <form id="activateNotificationPolicyForm" class="notice-stack">
          <div class="notice">${et('Activating')} <strong>${escapeHtml(policy.name)}</strong> ${et('permits {deliveries} to', { deliveries: eventLabels.join(` ${t('and')} `) || t('configured deliveries') })} <strong>${escapeHtml(policy.destinationLabel || t('the configured destination'))}</strong>.</div>
          <label><input type="checkbox" name="confirmActivation" required> ${et('I confirm this workspace may deliver these notifications.')}</label>
          <div class="toolbar modal-actions"><button class="button" type="button" id="cancelNotificationActivation">${et('Cancel')}</button><button class="button primary" type="submit">${et('Activate policy')}</button></div>
        </form>`;
      elements.modal.classList.add('open');
      document.getElementById('cancelNotificationActivation').addEventListener('click', callbacks.closeModal);
      const form = document.getElementById('activateNotificationPolicyForm');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        if (button.disabled) return;
        button.disabled = true;
        button.textContent = t('Activating...');
        const saved = await updateNotificationPolicyStatus(policy, 'active', button, { closeOnCommit: true });
        if (!saved) {
          button.disabled = false;
          button.textContent = t('Activate policy');
        }
      });
      return true;
    }

    function openNotificationTest(policy) {
      if (!policy || state.ledger?.demoMode || !elements.modal || !elements.modalTitle || !elements.modalBody) return false;
      const policyId = getId(policy.id || policy._id);
      elements.modalTitle.textContent = t('Send test alert');
      elements.modalBody.innerHTML = `
        <form id="notificationTestForm" class="notice-stack">
          <div class="notice">${et('This sends a real test delivery to')} <strong>${escapeHtml(policy.destinationLabel || t('the configured destination'))}</strong>. ${et('It does not activate the policy.')}</div>
          <label><input type="checkbox" name="confirmDelivery" required> ${et('I understand this sends an external test notification.')}</label>
          <div class="toolbar modal-actions"><button class="button" type="button" id="cancelNotificationTest">${et('Cancel')}</button><button class="button primary" type="submit">${et('Send test')}</button></div>
        </form>`;
      elements.modal.classList.add('open');
      document.getElementById('cancelNotificationTest').addEventListener('click', callbacks.closeModal);
      const form = document.getElementById('notificationTestForm');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        if (button.disabled) return;
        button.disabled = true;
        button.textContent = t('Sending...');
        try {
          await callbacks.sendNotificationPolicyTest(policyId);
        } catch (error) {
          button.disabled = false;
          button.textContent = t('Send test');
          callbacks.openNotice(t('Test delivery failed'), error.message);
          return;
        }
        callbacks.closeModal();
        await refreshAfterPolicyCommit(
          'Test delivered',
          'The external destination accepted the test alert.',
          'The test was delivered, but the operations ledger could not refresh. Reopen Approvals to load the latest evidence.'
        );
      });
      return true;
    }

    function render() {
      document.querySelectorAll('[data-queue-filter]').forEach((button) => {
        button.classList.toggle('active', button.dataset.queueFilter === state.queueFilter);
      });

      const ledger = state.ledger || {};
      const decisions = ledger.decisions || [];
      const recommendations = ledger.recommendations || [];
      const actions = ledger.actions || [];
      const auditEvents = ledger.auditEvents || [];
      const followUps = ledger.followUps || [];
      const workerResponses = ledger.workerResponses || [];
      const accountability = ledger.accountability;
      const outcomes = ledger.outcomes || [];
      const findings = ledger.findings || [];
      const healthSnapshots = ledger.healthSnapshots || [];
      const reconciliationHealth = ledger.reconciliationHealth;
      const notificationPolicies = ledger.notificationPolicies || [];
      const notificationDeliveries = ledger.notificationDeliveries || [];
      const timeline = ledger.timeline || [];
      const reconciliationSummary = reconciliationHealth?.summary || {};

      const openRobert = decisions.filter(item => item.ownerType === 'robert').length;
      const vaTeam = decisions.filter(item => ['va', 'team'].includes(item.ownerType)).length;
      const pendingRecommendations = recommendations.filter(item => ['pending', 'approved', 'change_requested'].includes(item.status)).length;
      const failedActions = actions.filter(item => item.status === 'failed').length;
      const highRiskFindings = findings.filter(item => ['critical', 'high'].includes(item.severity)).length;
      const outcomesNeedingAttention = outcomes.filter(item => ['needs_attention', 'not_verified'].includes(item.status)).length;

      elements.approvalCount.textContent = openRobert + pendingRecommendations;
      elements.ledgerMetrics.innerHTML = [
        ['Robert decisions', openRobert],
        ['VA/team queue', vaTeam],
        ['Awaiting review', pendingRecommendations],
        ['Failed actions', failedActions],
        ['Reconciliation alerts', reconciliationSummary.requiresOperator || 0],
        ['Critical evidence gaps', reconciliationSummary.critical || 0],
        ['Open findings', findings.length],
        ['High-risk findings', highRiskFindings],
        ['Overdue follow-ups', accountability?.summary?.overdueFollowUps || 0],
        ['Workers needing attention', accountability?.summary?.membersNeedingAttention || 0],
        ['Outcome reviews', outcomesNeedingAttention],
        ['Audit events', auditEvents.length],
        ['Recent responses', workerResponses.length]
      ].map(([label, value]) => `
        <div class="metric"><span>${et(label)}</span><strong>${value}</strong></div>
      `).join('');

      const filteredDecisions = state.queueFilter === 'all'
        ? decisions
        : decisions.filter(item => item.ownerType === state.queueFilter);
      const errorNotice = (ledger.errors || []).length > 0
        ? `<div class="notice">${et('Operations ledger needs live data:')} ${escapeHtml(unique(ledger.errors).join(' | '))}</div>`
        : ledger.demoMode
          ? `<div class="notice">${et('Read-only demo ledger. It shows representative approval evidence and never sends provider writes or saves decisions.')}</div>`
          : '';

      elements.notificationPolicyButton.disabled = Boolean(ledger.demoMode);
      elements.notificationPolicyButton.title = ledger.demoMode
        ? t('Notification policies are unavailable in the read-only demo ledger.')
        : '';
      elements.decisionQueue.innerHTML = errorNotice + listOrEmpty(filteredDecisions, renderDecisionItem);
      elements.recommendationCount.textContent = ep('{count} pending', '{count} pending', pendingRecommendations, { count: pendingRecommendations });
      elements.recommendationList.innerHTML = listOrEmpty(recommendations, renderRecommendation);
      elements.findingsCount.textContent = ep('{count} open', '{count} open', findings.length, { count: findings.length });
      elements.findingsList.innerHTML = listOrEmpty(findings, renderFinding);
      elements.timelineCount.textContent = ep('{count} recent', '{count} recent', timeline.length, { count: timeline.length });
      elements.operationsTimeline.innerHTML = listOrEmpty(timeline.slice(0, 12), renderTimelineItem);
      elements.boardHealthCount.textContent = ep('{count} snapshot', '{count} snapshots', healthSnapshots.length, { count: healthSnapshots.length });
      elements.boardHealthList.innerHTML = listOrEmpty(healthSnapshots, renderBoardHealth);
      elements.trelloAttemptCount.textContent = reconciliationSummary.requiresOperator
        ? ep('{count} needs evidence', '{count} need evidence', reconciliationSummary.requiresOperator, { count: reconciliationSummary.requiresOperator })
        : ep('{count} attempt', '{count} attempts', actions.length, { count: actions.length });
      elements.trelloAttempts.innerHTML = `${renderTrelloReconciliationHealth(reconciliationHealth)}${listOrEmpty(actions, renderTrelloAttempt)}`;
      elements.notificationPolicyCount.textContent = ep('{count} policy', '{count} policies', notificationPolicies.length, { count: notificationPolicies.length });
      elements.notificationPolicies.innerHTML = listOrEmpty(notificationPolicies, renderNotificationPolicy);
      elements.notificationDeliveryCount.textContent = ep('{count} event', '{count} events', notificationDeliveries.length, { count: notificationDeliveries.length });
      elements.notificationDeliveries.innerHTML = listOrEmpty(notificationDeliveries, renderNotificationDelivery);
      elements.followUpCount.textContent = ep('{count} due', '{count} due', followUps.length, { count: followUps.length });
      elements.followUps.innerHTML = listOrEmpty(followUps, renderFollowUp);
      elements.accountabilityCount.textContent = ep('{count} person', '{count} people', accountability?.summary?.members || 0, { count: accountability?.summary?.members || 0 });
      elements.accountabilityList.innerHTML = accountability
        ? listOrEmpty(accountability.members || [], renderWorkerAccountability)
        : `<div class="notice">${et('Worker accountability needs ledger access.')}</div>`;
      elements.outcomeCount.textContent = ep('{count} review', '{count} reviews', outcomesNeedingAttention, { count: outcomesNeedingAttention });
      elements.outcomeList.innerHTML = listOrEmpty(outcomes, renderInterventionOutcome);
      elements.auditCount.textContent = ep('{count} event', '{count} events', auditEvents.length, { count: auditEvents.length });
      elements.auditTrail.innerHTML = listOrEmpty(auditEvents, renderAuditEvent);
      bindActions();
    }

    function bindActions() {
      document.querySelectorAll('[data-recommendation-action]').forEach(button => button.addEventListener('click', () => callbacks.runRecommendationAction(button.dataset.recommendationId, button.dataset.recommendationAction)));
      document.querySelectorAll('[data-decision-action]').forEach(button => button.addEventListener('click', () => callbacks.runDecisionAction(button.dataset.decisionId, button.dataset.decisionAction)));
      document.querySelectorAll('[data-followup-action]').forEach(button => button.addEventListener('click', () => callbacks.runFollowUpAction(button.dataset.followupId, button.dataset.followupAction)));
      document.querySelectorAll('[data-followup-response]').forEach(button => button.addEventListener('click', () => callbacks.openWorkerResponseRecorder(button.dataset.followupResponse)));
      document.querySelectorAll('[data-payload-edit]').forEach(button => button.addEventListener('click', () => callbacks.editRecommendationPayload(button.dataset.payloadEdit)));
      document.querySelectorAll('[data-recommendation-evidence]').forEach(button => button.addEventListener('click', () => callbacks.openRecommendationEvidence(button.dataset.recommendationEvidence)));
      document.querySelectorAll('[data-trello-action-reconcile]').forEach(button => button.addEventListener('click', () => callbacks.openTrelloActionReconciliation(button.dataset.trelloActionReconcile)));
      document.querySelectorAll('[data-outcome-evaluate]').forEach(button => button.addEventListener('click', () => callbacks.runOutcomeEvaluation(button.dataset.outcomeEvaluate)));
      document.querySelectorAll('[data-notification-policy-edit]').forEach(button => button.addEventListener('click', () => {
        const policy = (state.ledger.notificationPolicies || []).find(item => getId(item.id || item._id) === button.dataset.notificationPolicyEdit);
        if (policy) openNotificationPolicyForm(policy);
      }));
      document.querySelectorAll('[data-notification-policy-activate]').forEach(button => button.addEventListener('click', () => {
        const policy = (state.ledger.notificationPolicies || []).find(item => getId(item.id || item._id) === button.dataset.notificationPolicyActivate);
        if (policy) openNotificationActivation(policy);
      }));
      document.querySelectorAll('[data-notification-policy-pause]').forEach(button => button.addEventListener('click', () => {
        const policy = (state.ledger.notificationPolicies || []).find(item => getId(item.id || item._id) === button.dataset.notificationPolicyPause);
        if (policy) updateNotificationPolicyStatus(policy, 'paused', button);
      }));
      document.querySelectorAll('[data-notification-policy-test]').forEach(button => button.addEventListener('click', () => {
        const policy = (state.ledger.notificationPolicies || []).find(item => getId(item.id || item._id) === button.dataset.notificationPolicyTest);
        if (policy) openNotificationTest(policy);
      }));
      document.querySelectorAll('[data-notification-delivery-evidence]').forEach(button => button.addEventListener('click', () => callbacks.openNotificationDeliveryEvidence(button.dataset.notificationDeliveryEvidence)));
      callbacks.bindLedgerDrilldownActions();
      callbacks.bindGraphActions();
    }

    function renderDecisionItem(item) {
      const itemId = getId(item._id);
      const recommendationId = getId(item.recommendationId);
      const canManageDecision = (item.status || 'open') === 'open';
      return `
        <div class="item">
          <div class="item-title"><strong>${escapeHtml(item.question || item.title)}</strong><span class="pill ${severityClass(item.riskLevel)}">${es(item.ownerType)}</span></div>
          <div class="meta"><span>${escapeHtml(item.reason || t('Approval required'))}</span><span>${es(item.riskLevel, 'medium')} ${et('risk')}</span><span>${et('Answer: {answer}', { answer: semantic(item.recommendedAnswer, 'yes') })}</span></div>
          ${renderSourceEvidence(item.sourceEvidence)}
          ${recommendationId && canManageDecision && !state.ledger.demoMode ? renderReviewActions(recommendationId) : ''}
          ${state.ledger.demoMode || !canManageDecision ? '' : `<div class="item-actions">
            <button class="button" data-decision-id="${escapeHtml(itemId)}" data-decision-action="snooze" type="button">${et('Snooze 24h')}</button>
            <button class="button warn" data-decision-id="${escapeHtml(itemId)}" data-decision-action="delegate-team" type="button">${et('Delegate team')}</button>
            <button class="button warn" data-decision-id="${escapeHtml(itemId)}" data-decision-action="delegate-va" type="button">${et('Delegate VA')}</button>
          </div>`}
        </div>`;
    }

    function renderRecommendation(recommendation) {
      const id = getId(recommendation._id);
      const sourceEvidence = recommendation.sourceEvidence || [];
      return `
        <div class="item">
          <div class="item-title"><strong>${escapeHtml(recommendation.title || recommendation.recommendedAction)}</strong><span class="pill ${severityClass(recommendation.riskLevel)}">${es(recommendation.status)}</span></div>
          <div class="meta"><span>${es(recommendation.actionType)}</span><span>${es(recommendation.ownerType, 'robert')}</span><span>${et('{count}% confidence', { count: Math.round((recommendation.confidence || 0) * 100) })}</span><span>${ep('{count} evidence item', '{count} evidence items', sourceEvidence.length, { count: sourceEvidence.length })}</span></div>
          <div class="meta">${escapeHtml(recommendation.approvalReason || recommendation.description || t('Review the exact payload before action.'))}</div>
          ${renderSourceEvidence(sourceEvidence)}
          <details class="payload"><summary>${et('Exact action payload')}</summary><pre>${escapeHtml(JSON.stringify(recommendation.actionPayload || {}, null, 2))}</pre></details>
          ${state.ledger.demoMode ? '' : `<div class="item-actions"><button class="button" data-recommendation-evidence="${escapeHtml(id)}" type="button">${et('Evidence bundle')}</button></div>`}
          ${state.ledger.demoMode ? '' : renderPayloadEditAction(id, recommendation)}
          ${state.ledger.demoMode ? '' : renderReviewActions(id, recommendation.status, recommendation)}
        </div>`;
    }

    function renderReviewActions(recommendationId, status = 'pending', recommendation = {}) {
      const payload = recommendation.actionPayload || {};
      const canApprove = ['pending', 'change_requested', 'snoozed', 'delegated'].includes(status);
      const canReject = ['pending', 'approved', 'change_requested', 'snoozed', 'delegated'].includes(status);
      const canChange = ['pending', 'approved', 'snoozed', 'delegated'].includes(status);
      const executable = payload.executable !== false && payload.draftOnly !== true && recommendation.actionType !== 'manual_review';
      const executeButton = status === 'approved' && executable
        ? `<button class="button primary" data-recommendation-id="${escapeHtml(recommendationId)}" data-recommendation-action="execute-approved" type="button">${et('Execute approved')}</button>`
        : '';
      if (!canApprove && !canReject && !canChange && !executeButton) return '';
      return `<div class="item-actions">
        ${canApprove ? `<button class="button primary" data-recommendation-id="${escapeHtml(recommendationId)}" data-recommendation-action="approve" type="button">${et('Yes')}</button>` : ''}
        ${canReject ? `<button class="button danger" data-recommendation-id="${escapeHtml(recommendationId)}" data-recommendation-action="reject" type="button">${et('No')}</button>` : ''}
        ${canChange ? `<button class="button warn" data-recommendation-id="${escapeHtml(recommendationId)}" data-recommendation-action="change" type="button">${et('Change')}</button>` : ''}
        ${executeButton}
      </div>`;
    }

    function renderPayloadEditAction(recommendationId, recommendation = {}) {
      if (!['pending', 'change_requested', 'snoozed', 'delegated'].includes(recommendation.status || 'pending')) return '';
      if (!canEditPayload?.(recommendation)) return '';
      return `<div class="item-actions"><button class="button warn" data-payload-edit="${escapeHtml(recommendationId)}" type="button">${et('Review payload')}</button></div>`;
    }

    function renderFinding(finding) {
      const card = finding.cardId || {};
      const board = finding.boardId || {};
      const cardId = getId(card._id || card.id);
      return `<div class="item">
        <div class="item-title"><strong>${escapeHtml(finding.title)}</strong><span class="pill ${severityClass(finding.severity)}">${es(finding.severity)}</span></div>
        <div class="meta"><span>${es(finding.findingType)}</span><span>${et('Waiting on {owner}', { owner: semantic(finding.waitingOn, 'unknown') })}</span><span>${et('{count}/100 signal', { count: finding.signalScore || 0 })}</span></div>
        <div class="meta"><span>${escapeHtml(board.name || t('Board'))}</span><span>${escapeHtml(card.name || t('Card'))}</span></div>
        <div class="meta">${escapeHtml(finding.recommendedAction || finding.description || t('Review finding'))}</div>
        ${renderSourceEvidence(finding.sourceEvidence)}
        ${cardId && !state.ledger.demoMode ? `<div class="item-actions"><button class="button" data-card-ledger="${escapeHtml(cardId)}" type="button">${et('Card ledger')}</button></div>` : ''}
      </div>`;
    }

    function renderBoardHealth(snapshot) {
      const board = snapshot.boardId || {};
      const counts = snapshot.counts || {};
      return `<div class="item">
        <div class="item-title"><strong>${escapeHtml(board.name || t('Board health'))}</strong><span class="pill ${snapshot.healthStatus === 'critical' ? 'critical' : snapshot.healthStatus === 'at_risk' ? 'high' : 'healthy'}">${es(snapshot.healthStatus)}</span></div>
        <div class="meta"><span>${et('{count}/100 health', { count: snapshot.healthScore })}</span><span>${ep('{count} finding', '{count} findings', counts.findings || 0, { count: counts.findings || 0 })}</span><span>${counts.robertQueueCandidates || 0} Robert</span><span>${et('{count} VA-ready', { count: counts.vaReadyCandidates || 0 })}</span></div>
        <div class="meta">${escapeHtml(snapshot.summary || t('No summary recorded'))}</div>
      </div>`;
    }

    function renderTrelloAttempt(attempt) {
      const attemptId = getId(attempt._id || attempt.id);
      const needsReconciliation = attempt.status === 'in_progress'
        || (attempt.status === 'succeeded' && attempt.recommendationId?.status === 'executing')
        || attempt.reconciliation?.status === 'required';
      const reconciliation = attempt.reconciliation || {};
      const stepLabel = (value) => {
        const checklistItem = String(value || '').match(/^checklist_item_(\d+)_created$/);
        return checklistItem
          ? t('Checklist item {count} created', { count: checklistItem[1] })
          : semantic(value);
      };
      const steps = values => (values || []).map(stepLabel).join(', ');
      return `<div class="item">
        <div class="item-title"><strong>${es(attempt.actionType)}</strong><span class="pill ${attempt.status === 'failed' ? 'critical' : attempt.status === 'succeeded' ? 'healthy' : 'review'}">${es(attempt.status)}</span></div>
        <div class="meta"><span>${fd(attempt.startedAt || attempt.createdAt)}</span><span>${escapeHtml(attempt.errorMessage || t('No error recorded'))}</span></div>
        <details class="payload"><summary>${et('Attempt payload')}</summary><pre>${escapeHtml(JSON.stringify(attempt.payload || {}, null, 2))}</pre></details>
        ${reconciliation.status && reconciliation.status !== 'not_needed' ? `<div class="meta"><span>${es(reconciliation.status)}</span><span>${escapeHtml(reconciliation.reconciledBy || t('operator'))}</span><span>${fd(reconciliation.reconciledAt)}</span></div>` : ''}
        ${reconciliation.reason ? `<div class="meta"><span>${escapeHtml(reconciliation.reason)}</span></div>` : ''}
        ${reconciliation.confirmedSteps?.length || reconciliation.pendingSteps?.length ? `<div class="meta">${reconciliation.confirmedSteps?.length ? `<span>${et('Confirmed: {steps}', { steps: steps(reconciliation.confirmedSteps) })}</span>` : ''}${reconciliation.pendingSteps?.length ? `<span>${et('Check: {steps}', { steps: steps(reconciliation.pendingSteps) })}</span>` : ''}</div>` : ''}
        ${needsReconciliation && attemptId && !state.ledger.demoMode ? `<div class="item-actions"><button class="button warn" data-trello-action-reconcile="${escapeHtml(attemptId)}" type="button">${et('Reconcile result')}</button></div>` : ''}
      </div>`;
    }

    function renderTrelloReconciliationHealth(health) {
      if (!health) return '';
      const summary = health.summary || {};
      const alerts = (health.items || []).filter(item => ['critical', 'warning'].includes(item.severity));
      if (alerts.length === 0) {
        return `<div class="item"><div class="item-title"><strong>${et('Reconciliation coverage')}</strong><span class="pill healthy">${et('current')}</span></div><div class="meta"><span>${ep('{count} unresolved claim', '{count} unresolved claims', summary.unresolved || 0, { count: summary.unresolved || 0 })}</span><span>${et('Evidence warning at {hours}h', { hours: health.thresholds?.warningHours || 4 })}</span></div></div>`;
      }
      return `<div class="item">
        <div class="item-title"><strong>${et('Reconciliation attention')}</strong><span class="pill ${summary.critical ? 'critical' : 'high'}">${et('{critical} critical, {warning} warning', { critical: summary.critical || 0, warning: summary.warning || 0 })}</span></div>
        <div class="meta"><span>${et('Confirm the observed provider result in the matching action below.')}</span><span>${et('Thresholds: {warning}h / {critical}h', { warning: health.thresholds?.warningHours || 4, critical: health.thresholds?.criticalHours || 24 })}</span></div>
        <div class="meta">${alerts.slice(0, 3).map(item => `<span>${escapeHtml(item.actionType || t('Trello action'))}: ${escapeHtml(item.message)}</span>`).join('')}</div>
      </div>`;
    }

    function renderNotificationPolicy(policy) {
      const policyId = getId(policy.id || policy._id);
      const statusClass = policy.status === 'active' ? 'healthy' : 'review';
      const isWeeklyStatus = (policy.eventTypes || []).includes('weekly_status_report');
      const isDailyOperationsBrief = (policy.eventTypes || []).includes('daily_operations_brief');
      const reportSchedule = policy.reportSchedule || {};
      const dailyBriefSchedule = policy.dailyBriefSchedule || {};
      const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const schedules = [
        isDailyOperationsBrief && dailyBriefSchedule.enabled ? t('Daily operations brief at {hour}:00 UTC', { hour: dailyBriefSchedule.hourUtc }) : '',
        isWeeklyStatus && reportSchedule.enabled ? t('Weekly status every {day} at {hour}:00 UTC', { day: t(weekDays[reportSchedule.dayOfWeekUtc] || 'Monday'), hour: reportSchedule.hourUtc }) : ''
      ].filter(Boolean).join(' | ');
      return `<div class="item">
        <div class="item-title"><strong>${escapeHtml(policy.name)}</strong><span class="pill ${statusClass}">${es(policy.status)}</span></div>
        <div class="meta"><span>${es(policy.channel)}</span><span>${escapeHtml(policy.destinationLabel || t('Unlabelled destination'))}</span><span>${et('{severity} and above', { severity: semantic(policy.minimumSeverity) })}</span></div>
        <div class="meta"><span>${et(policy.destinationConfigured ? 'Encrypted destination configured' : 'Destination needs configuration')}</span><span>${policy.quietHours?.enabled ? et('Warning alerts defer {start}:00-{end}:00 UTC', { start: policy.quietHours.startHourUtc, end: policy.quietHours.endHourUtc }) : et('No quiet hours')}</span></div>
        <div class="meta"><span>${policy.digest?.enabled ? et('Warning digest at {hour}:00 UTC, up to {count} items', { hour: policy.digest.hourUtc, count: policy.digest.maximumItems }) : et('Warning alerts deliver individually')}</span></div>
        <div class="meta"><span>${escapeHtml(schedules || t('No scheduled brief or report'))}</span></div>
        ${renderNotificationPolicySchedulerHealth(policy)}
        <div class="item-actions">
          <button class="button" data-notification-policy-edit="${escapeHtml(policyId)}" type="button">${et('Edit')}</button>
          ${policy.status === 'active' ? `<button class="button" data-notification-policy-pause="${escapeHtml(policyId)}" type="button">${et('Pause')}</button>` : `<button class="button primary" data-notification-policy-activate="${escapeHtml(policyId)}" type="button">${et('Activate')}</button>`}
          <button class="button" data-notification-policy-test="${escapeHtml(policyId)}" type="button">${et('Send test')}</button>
        </div>
      </div>`;
    }

    function renderNotificationPolicySchedulerHealth(policy) {
      const jobsByEventType = {
        reconciliation_alert: { jobName: 'notifications.reconciliation_alerts', label: 'Alert scheduler' },
        weekly_status_report: { jobName: 'notifications.weekly_status_reports', label: 'Report scheduler' },
        daily_operations_brief: { jobName: 'notifications.daily_operations_briefs', label: 'Daily brief scheduler' }
      };
      const healthByJobName = new Map((state.notificationJobHealth || []).map(job => [job.jobName, job]));
      const schedulers = (policy.eventTypes || []).map(eventType => jobsByEventType[eventType]).filter(Boolean).map(config => ({ ...config, health: healthByJobName.get(config.jobName) }));
      if (schedulers.length === 0) return '';
      return `<div class="meta">${schedulers.map(({ label, health }) => {
        const status = health?.status || 'unavailable';
        const statusClass = status === 'failed' ? 'critical' : status === 'stale' ? 'high' : status === 'healthy' ? 'healthy' : 'review';
        const detail = health
          ? t('{label}: {status}, last run {date}', { label: t(label), status: semantic(status), date: fd(health.lastRunAt) })
          : t('{label}: health unavailable', { label: t(label) });
        return `<span class="pill ${statusClass}">${escapeHtml(detail)}</span>`;
      }).join('')}</div>`;
    }

    function renderNotificationDelivery(delivery) {
      const policy = (state.ledger.notificationPolicies || []).find(item => getId(item.id || item._id) === getId(delivery.policyId));
      const statusClass = ['delivered', 'digested'].includes(delivery.status) ? 'healthy' : delivery.status === 'failed' ? 'critical' : 'review';
      const deliveryId = getId(delivery.id || delivery._id);
      const sourceEvidence = notificationDeliverySourceEvidence(delivery);
      return `<div class="item">
        <div class="item-title"><strong>${escapeHtml(delivery.title || t('Notification delivery'))}</strong><span class="pill ${statusClass}">${es(delivery.status)}</span></div>
        <div class="meta"><span>${escapeHtml(policy?.name || t('Notification policy'))}</span><span>${es(delivery.severity, 'info')}</span><span>${fd(delivery.deliveredAt || delivery.failedAt || delivery.createdAt)}</span></div>
        <div class="meta"><span>${escapeHtml(delivery.errorMessage || delivery.message || t('Delivery recorded'))}</span></div>
        ${renderSourceEvidence(sourceEvidence)}
        ${sourceEvidence.length && deliveryId ? `<div class="item-actions"><button class="button" data-notification-delivery-evidence="${escapeHtml(deliveryId)}" type="button">${et('Source details')}</button></div>` : ''}
      </div>`;
    }

    function notificationDeliverySourceEvidence(delivery = {}) {
      const candidates = [
        ...(Array.isArray(delivery.sourceEvidence) ? delivery.sourceEvidence : []).map(item => ({ ...item, type: item.sourceType || item.type || 'source' })),
        ...(delivery.sourceUrl ? [{ type: delivery.sourceType || 'source', label: t('Open source evidence'), url: delivery.sourceUrl }] : [])
      ];
      const seenUrls = new Set();
      return candidates.filter((item) => {
        const sourceUrl = safeExternalUrl(item.url);
        if (!sourceUrl || seenUrls.has(sourceUrl)) return false;
        seenUrls.add(sourceUrl);
        return true;
      });
    }

    function renderFollowUp(followUp) {
      const followUpId = getId(followUp._id || followUp.id);
      const interventionId = getId(followUp.interventionId);
      return `<div class="item">
        <div class="item-title"><strong>${escapeHtml(followUp.reason || t('Follow-up needed'))}</strong><span class="pill review">${es(followUp.status, 'due')}</span></div>
        <div class="meta"><span>${et('Due {date}', { date: fd(followUp.dueAt) })}</span><span>${escapeHtml(followUp.nextAction || t('Review worker response'))}</span></div>
        ${state.ledger.demoMode ? '' : `<div class="item-actions">${interventionId ? `<button class="button" data-followup-response="${escapeHtml(interventionId)}" type="button">${et('Record response')}</button>` : ''}<button class="button primary" data-followup-id="${escapeHtml(followUpId)}" data-followup-action="resolved" type="button">${et('Resolved')}</button><button class="button" data-followup-id="${escapeHtml(followUpId)}" data-followup-action="escalated" type="button">${et('Escalate')}</button></div>`}
      </div>`;
    }

    function renderWorkerAccountability(member) {
      const attentionClass = member.attention === 'needs_attention' ? 'critical' : member.attention === 'watch' ? 'review' : 'healthy';
      const attentionLabel = member.attention === 'needs_attention' ? 'needs attention' : member.attention === 'watch' ? 'watch' : 'clear';
      const coverage = member.responseCoverage === null || member.responseCoverage === undefined
        ? t('No follow-ups in window')
        : t('{count}% response coverage', { count: member.responseCoverage });
      return `<div class="item">
        <div class="item-title"><strong>${escapeHtml(member.name || t('Unknown member'))}</strong><span class="pill ${attentionClass}">${et(attentionLabel)}</span></div>
        <div class="meta"><span>${et('{level} workload', { level: semantic(member.workloadLevel, 'unknown') })}</span><span>${ep('{count} follow-up', '{count} follow-ups', member.followUpsCreated || 0, { count: member.followUpsCreated || 0 })}</span><span>${ep('{count} response', '{count} responses', member.responseCount || 0, { count: member.responseCount || 0 })}</span><span>${escapeHtml(coverage)}</span></div>
        <div class="meta"><span>${ep('{count} overdue', '{count} overdue', member.overdueFollowUps || 0, { count: member.overdueFollowUps || 0 })}</span><span>${ep('{count} escalated', '{count} escalated', member.escalatedFollowUps || 0, { count: member.escalatedFollowUps || 0 })}</span><span>${ep('{count} blocked', '{count} blocked', member.blockedResponses || 0, { count: member.blockedResponses || 0 })}</span><span>${ep('{count} explicitly ignored', '{count} explicitly ignored', member.ignoredResponses || 0, { count: member.ignoredResponses || 0 })}</span></div>
      </div>`;
    }

    function renderInterventionOutcome(outcome) {
      const statusClass = outcome.status === 'confirmed_improved' ? 'healthy' : outcome.status === 'awaiting_evidence' ? 'review' : 'critical';
      const recommendation = outcome.recommendationId || {};
      const recommendationId = getId(recommendation._id || outcome.recommendationId);
      const canEvaluate = Boolean(recommendationId) && ['awaiting_evidence', 'needs_attention', 'not_verified'].includes(outcome.status);
      return `<div class="item">
        <div class="item-title"><strong>${escapeHtml(recommendation.title || t('{action} outcome', { action: semantic(outcome.actionType, 'Intervention') }))}</strong><span class="pill ${statusClass}">${es(outcome.status, 'awaiting evidence')}</span></div>
        <div class="meta"><span>${es(outcome.actionType, 'action')}</span><span>${et('Checked {date}', { date: fd(outcome.evaluatedAt) })}</span></div>
        <div class="meta"><span>${escapeHtml(outcome.summary || t('Outcome evidence is pending.'))}</span></div>
        ${canEvaluate && !state.ledger.demoMode ? `<div class="item-actions"><button class="button" data-outcome-evaluate="${escapeHtml(recommendationId)}" type="button">${et('Refresh evidence')}</button></div>` : ''}
      </div>`;
    }

    function renderAuditEvent(event) {
      return `<div class="item"><div class="item-title"><strong>${escapeHtml(event.action)}</strong><span class="pill ${severityClass(event.riskLevel)}">${escapeHtml(event.source)}</span></div><div class="meta"><span>${fd(event.createdAt)}</span><span>${escapeHtml(event.actor || 'sneup')}</span><span>${escapeHtml(event.entityType)}</span></div></div>`;
    }

    function renderTimelineItem(entry = {}) {
      const meta = (entry.meta || []).filter(Boolean);
      return `<div class="item"><div class="item-title"><strong>${escapeHtml(entry.title || t('Ledger event'))}</strong><span class="pill ${severityClass(entry.severity)}">${es(entry.status, 'recorded')}</span></div><div class="meta"><span>${fd(entry.occurredAt)}</span><span>${es(entry.type, 'event')}</span>${meta.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></div>`;
    }

    function renderSourceEvidence(sourceEvidence = []) {
      if (!sourceEvidence || sourceEvidence.length === 0) return '';
      const visibleRefs = sourceEvidence.slice(0, 3);
      const remainingCount = Math.max(0, sourceEvidence.length - visibleRefs.length);
      return `<div class="source-evidence" aria-label="${et('Source evidence')}">${visibleRefs.map(renderSourceEvidenceRef).join('')}${remainingCount ? `<span class="evidence-ref">${et('+{count} more', { count: remainingCount })}</span>` : ''}</div>`;
    }

    function renderSourceEvidenceRef(item = {}) {
      const label = escapeHtml(item.label || item.type || t('Evidence'));
      const sourceUrl = safeExternalUrl(item.url);
      const title = et('{type} evidence', { type: semantic(item.type, 'source') });
      return sourceUrl
        ? `<a class="evidence-ref evidence-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer" title="${title}">${label}</a>`
        : `<span class="evidence-ref" title="${title}">${label}</span>`;
    }

    function safeExternalUrl(value) {
      if (!value) return '';
      try {
        const url = new URL(String(value));
        if (url.protocol !== 'https:' || url.username || url.password) return '';
        return url.toString();
      } catch (error) {
        return '';
      }
    }

    return {
      render,
      renderRecommendation,
      renderFinding,
      renderTrelloAttempt,
      renderInterventionOutcome,
      renderAuditEvent,
      renderSourceEvidence,
      notificationDeliverySourceEvidence,
      safeExternalUrl,
      openNotificationPolicyForm,
      openNotificationActivation,
      openNotificationTest
    };
  }

  return { createController, DYNAMIC_OPERATOR_MESSAGES, NL_MESSAGES };
});
