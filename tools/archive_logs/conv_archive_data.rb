######################################################################
# conv_json_data.rbで変換したjsonを元に
# 時間単位に分割する。 
######################################################################

Bundler.require
require 'time'
require 'json'
require 'optparse'

def parse_option()
  opt = {
    date: nil,
    all_json: false,
    verbose: false,
    json_dir: 'data/out/json',
    archive_dir: 'data/out/archives',
  }

  OptionParser.new do |parser|
    parser.on('--date DATE', 'YYYY-MM-DD') {|v| opt[:date] = Date.strptime(v, "%Y-%m-%d")}
    parser.on('--all-json', 'Convert all json files in json_dir') { opt[:all_json] = true }
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

    messages = JSON.parse(IO.read("#{opt[:json_dir]}/messages-#{date_str}.json"), symbolize_names: true)

    # 時間別かつ一定メッセージずつ分割する。
    # メタデータ情報
    metadata = {
      files: [], # ファイル一覧
      hours: {}, # 時間帯別のファイル一覧
    }
    archive_messages = []
    current_idx = 0
    current_hour = '00' 
    message_count = 0
    per_file = 1000
    messages.each do |message|
      date = Time.strptime(message[:date], "%Y-%m-%dT%H:%M:%S.%L")
      file_hour = date.strftime("%H")
      if current_hour != file_hour
        message_count = 0
        current_idx = 0
      end

      file_idx = message_count / per_file
      message_count += 1

      if current_hour != file_hour
        saved_info = save_archive_messages(out_dir, current_hour, current_idx, archive_messages)
        metadata[:hours]["h#{current_hour}"] ||= { files: [], message_num: 0 }
        metadata[:hours]["h#{current_hour}"][:files].push(saved_info[:filename])
        metadata[:hours]["h#{current_hour}"][:message_num] += saved_info[:message_num]

        current_hour = file_hour
        archive_messages = []
      elsif current_idx != file_idx
        saved_info = save_archive_messages(out_dir, current_hour, file_idx, archive_messages)
        metadata[:hours]["h#{current_hour}"] ||= { files: [], message_num: 0 }
        metadata[:hours]["h#{current_hour}"][:files].push(saved_info[:filename])
        metadata[:hours]["h#{current_hour}"][:message_num] += saved_info[:message_num]
 
        current_idx = file_idx
        archive_messages = [] 
      end
      
      archive_messages.push(message)
    end

    saved_info = save_archive_messages(out_dir, current_hour, current_idx, archive_messages)
    metadata[:hours]["h#{current_hour}"] ||= { files: [], message_num: 0 }
    metadata[:hours]["h#{current_hour}"][:files].push(saved_info[:filename])
    metadata[:hours]["h#{current_hour}"][:message_num] += saved_info[:message_num]

    save_archive_metadata(out_dir, metadata)
  end
end

main()