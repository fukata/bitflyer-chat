######################################################################
# conv_json_data.rbで変換したjsonを元に
# - 時間単位 
# - ユーザー単位・時間単位 
# - ユーザー一覧 
######################################################################

Bundler.require
require 'time'
require 'json'
require 'optparse'
require 'digest/sha2'
require 'active_support/all'
require 'thread/pool'

def parse_option()
  opt = {
    date: nil,
    all_json: false,
    verbose: false,
    json_dir: 'data/out/json',
    archive_dir: 'data/out/archives',
    user_meta: false,
  }

  OptionParser.new do |parser|
    parser.on('--date DATE', 'YYYY-MM-DD') {|v| opt[:date] = Date.strptime(v, "%Y-%m-%d")}
    parser.on('--all-json', 'Convert all json files in json_dir') { opt[:all_json] = true }
    parser.on('--user-meta', 'Make user metadata.') { opt[:user_meta] = true }
    parser.on('--verbose', 'verbose') { opt[:verbose] = true }
    parser.parse!(ARGV)
  end

  opt
end

def save_archive_metadata(out_dir, metadata)
  metadata.merge!({
    created_at: Time.now.utc.iso8601(),
    files: metadata[:hours].values.map{|v| v[:files]}.flatten,
    message_num: metadata[:hours].values.map{|v| v[:message_num]}.reduce(:+),
  })
  File.open("#{out_dir}/metadata.json", 'w') do |f|
    f.puts(JSON.dump(metadata))
  end
end

def save_archive_users_metadata(out_dir, users_metadata)
  metadata = {
    users: users_metadata[:users].values.map{|v| v}.sort{|a,b| b[:message_num] <=> a[:message_num]},
    hours: {},
  }

  users_metadata[:hours].each do |hour, meta|
    users = meta[:users].values.map{|v| v}.sort{|a,b| b[:message_num] <=> a[:message_num]}
    metadata[:hours][hour] = {
      users: users 
    }
  end

  File.open("#{out_dir}/metadata.users.json", 'w') do |f|
    f.puts(JSON.dump(metadata))
  end

  pool = Thread.pool(Facter["processorcount"].value.to_i)
  metadata[:users].each do |m|
    pool.process {
      user_id = m[:user_id]
      meta = { hours: {}, message_num: 0 }
      users_metadata[:hours].each do |hour, m_hour|
        meta[:hours][hour] ||= { message_num: 0 }
        meta[:hours][hour][:message_num] += m_hour.dig(:users, user_id, :message_num) || 0
      end

      filename = "users/users.#{user_id}.metadata.json"
      File.open("#{out_dir}/#{filename}", 'w') do |f|
        f.puts(JSON.dump(meta))
      end
    }
  end
  pool.shutdown

  metadata
end

def save_archive_messages(out_dir, hour, idx, messages)
  filename = "messages.h#{hour}.#{idx}.json"
  File.open("#{out_dir}/#{filename}", 'w') do |f|
    f.puts(JSON.dump(messages))
  end
 
  {
    filename: filename,
    message_num: messages.length,
  }
end

def save_archive_user_messages(out_dir, hour, user_messages)
  users = {}

  pool = Thread.pool(Facter["processorcount"].value.to_i)
  user_messages.each do |nickname, new_messages|
    pool.process {
      user_id = Digest::SHA256.hexdigest(nickname)
      filename = "users/users.#{user_id}.messages.json"
      messages = File.exists?("#{out_dir}/#{filename}") ? JSON.parse(IO.read("#{out_dir}/#{filename}")) : []
      File.open("#{out_dir}/#{filename}", 'w') do |f|
        f.puts(JSON.dump(messages + new_messages))
      end
      users[user_id] = { hour: hour, message_num: new_messages.length, nickname: nickname }
    }
  end
  pool.shutdown
 
  {
    hour: hour,
    users: users,
  }
end

def merge_users_metadata(users_metadata, saved_user_info)
  metadata = users_metadata
  hour = saved_user_info[:hour]
  metadata[:hours][hour] ||= { users: {} }

  saved_user_info[:users].each do |user_id, meta|
    metadata[:users][user_id] ||= { message_num: 0, nickname: meta[:nickname], user_id: user_id }
    metadata[:users][user_id][:message_num] += meta[:message_num]

    metadata[:hours][hour][:users][user_id] ||= { message_num: 0, nickname: meta[:nickname], user_id: user_id }
    metadata[:hours][hour][:users][user_id][:message_num] += meta[:message_num] 
  end

  metadata
end

def save_users(out_dir, date, metadata)
  pool = Thread.pool(Facter["processorcount"].value.to_i)
  metadata[:users].each do |meta|
    pool.process {
      user_id = meta[:user_id]
      file_dir = "#{user_id[0,1]}/#{user_id[0,2]}/#{user_id[0,3]}"
      FileUtils.mkdir_p("#{out_dir}/#{file_dir}")

      filename = "#{file_dir}/users.#{user_id}.json" 
      user = File.exists?("#{out_dir}/#{filename}") ? JSON.parse(IO.read("#{out_dir}/#{filename}"), symbolize_names: true) : { user_id: meta[:user_id], nickname: meta[:nickname], message_nums: {} }
      user[:message_nums][date.strftime('%Y-%m-%d')] = meta[:message_num]
      File.open("#{out_dir}/#{filename}", 'w') do |f|
        f.puts(JSON.dump(user))
      end
    }
  end
  pool.shutdown
end

def main
  opt = parse_option()
  
  messages_json_files = []

  if opt[:all_json]
    messages_json_files = Dir["#{opt[:json_dir]}/messages-*.json"].uniq().sort()
  else
    unless opt[:date]
      raise "date is must be not blank."
    end
    date_str = opt[:date].strftime("%Y-%m-%d")
    messages_json_files = ["#{opt[:json_dir]}/messages-#{date_str}.json"]
  end

  messages_json_files.each do |message_json_file|
    date = Date.strptime(message_json_file, "#{opt[:json_dir]}/messages-%Y-%m-%d.json")
    date_str = date.strftime("%Y-%m-%d")
    out_dir = "#{opt[:archive_dir]}/#{date.strftime("%Y/%m/%d")}"

    if File.exists?(out_dir)
      next 
    end

    puts message_json_file

    # データ用ディレクトリを作成
    FileUtils.mkdir_p(out_dir)
    FileUtils.mkdir_p("#{out_dir}/users")
    FileUtils.mkdir_p("#{opt[:archive_dir]}/users")

    messages = JSON.parse(IO.read("#{opt[:json_dir]}/messages-#{date_str}.json"), symbolize_names: true)

    # 時間別かつ一定メッセージずつ分割する。
    # メタデータ情報
    metadata = {
      files: [], # ファイル一覧
      hours: {}, # 時間帯別のファイル一覧
    }
    archive_messages = []
    archive_user_messages = {} # ユーザーごとのメッセージ
    users_metadata = {
      users: {}, # ユーザー一覧
      hours: {}, # 時間別のユーザー一覧
    }
    current_idx = 0
    current_hour = '00' 
    message_count = 0
    per_file = 1000
    file_indexes = {}
    messages.each do |message|
      # 公開するアーカイブは日本時間
      date = Time.parse(message[:date]).in_time_zone('Asia/Tokyo')
      file_hour = date.strftime("%H")
      file_idx = (message_count / per_file).to_i

      if current_hour != file_hour
        file_indexes[current_hour] ||= -1
        file_indexes[current_hour] += 1 

        saved_info = save_archive_messages(out_dir, current_hour, file_indexes[current_hour], archive_messages)
        metadata[:hours]["h#{current_hour}"] ||= { files: [], message_num: 0 }
        metadata[:hours]["h#{current_hour}"][:files].push(saved_info[:filename])
        metadata[:hours]["h#{current_hour}"][:message_num] += saved_info[:message_num]

        saved_user_info = save_archive_user_messages(out_dir, current_hour, archive_user_messages) if opt[:user_meta] 
        users_metadata = merge_users_metadata(users_metadata, saved_user_info) if opt[:user_meta]

        current_hour = file_hour
        current_idx = 0
        message_count = 0
        archive_messages = []
        archive_user_messages = {}
      elsif current_idx != file_idx
        file_indexes[current_hour] ||= -1
        file_indexes[current_hour] += 1

        saved_info = save_archive_messages(out_dir, current_hour, file_indexes[current_hour], archive_messages)
        metadata[:hours]["h#{current_hour}"] ||= { files: [], message_num: 0 }
        metadata[:hours]["h#{current_hour}"][:files].push(saved_info[:filename])
        metadata[:hours]["h#{current_hour}"][:message_num] += saved_info[:message_num]
 
        current_idx = file_idx
        archive_messages = [] 
      end
      
      archive_messages.push(message)
      archive_user_messages[message[:nickname]] ||= []
      archive_user_messages[message[:nickname]].push(message)
      message_count += 1
    end

    if archive_messages.length > 0
      file_indexes[current_hour] ||= -1
      file_indexes[current_hour] += 1 
 
      saved_info = save_archive_messages(out_dir, current_hour, file_indexes[current_hour], archive_messages)
      metadata[:hours]["h#{current_hour}"] ||= { files: [], message_num: 0 }
      metadata[:hours]["h#{current_hour}"][:files].push(saved_info[:filename])
      metadata[:hours]["h#{current_hour}"][:message_num] += saved_info[:message_num]

      saved_user_info = save_archive_user_messages(out_dir, current_hour, archive_user_messages) if opt[:user_meta]
      users_metadata = merge_users_metadata(users_metadata, saved_user_info) if opt[:user_meta]
    end

    save_archive_metadata(out_dir, metadata)
    saved_users_metadata = save_archive_users_metadata(out_dir, users_metadata) if opt[:user_meta]
    save_users("#{opt[:archive_dir]}/users", date, saved_users_metadata) if opt[:user_meta]
  end
end

main()